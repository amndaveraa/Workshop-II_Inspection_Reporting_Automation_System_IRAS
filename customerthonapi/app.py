from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from docx import Document
from docx2pdf import convert
from docx.shared import Inches
import os
import tempfile
import uuid
from datetime import datetime
from io import BytesIO
import glob
import base64
import io
import re
import pythoncom
import time
import shutil
import random

app = Flask(__name__)

# Increase payload size limit to 100MB
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
CORS(app)  # Enable CORS for React app

from docx import Document
from docx.shared import Inches, Pt
from docx.text.paragraph import Paragraph


def fill_template(template_path, data):
    """
    Fill all placeholders - PROPERLY CREATE NEW ROWS
    """
    doc = Document(template_path)
    print("=" * 50)
    print("📦 DATA RECEIVED FROM REACT:")
    print("=" * 50)
    photo_entries = data.get("photoEntries", [])

    print(f"📸 Photo entries count: {len(photo_entries)}")

    # Print details of each entry
    for i, entry in enumerate(photo_entries):
        print(f"\n Entry {i+1}:")
        print(
            f"  - Has photo: {entry.get('photo', '')[:50]}..."
            if entry.get("photo")
            else "  - Has photo: No"
        )
        print(f"  - Finding: {entry.get('finding', 'N/A')[:50]}...")
        print(f"  - Recommendation: {entry.get('recommendation', 'N/A')[:50]}...")

    def replace_in_paragraph(paragraph, replacements):
        # [Keep your existing function - no changes]
        paragraph_text = paragraph.text
        for key, value in replacements.items():
            if key in paragraph_text:

                if isinstance(value, str) and value.startswith("data:image"):
                    try:
                        header, encoded = value.split(",", 1)
                        image_data = base64.b64decode(encoded)

                        for run in paragraph.runs:
                            run.text = ""

                        image_stream = io.BytesIO(image_data)
                        paragraph.add_run().add_picture(image_stream, width=Inches(3))
                        return True
                    except Exception as e:
                        print(f"Error processing image: {e}")
                        return False

                else:
                    combined_text = ""
                    runs_to_clear = []

                    for run in paragraph.runs:
                        combined_text += run.text
                        runs_to_clear.append(run)

                    new_text = combined_text.replace(key, str(value))

                    for run in runs_to_clear:
                        run.text = ""

                    if runs_to_clear:
                        runs_to_clear[0].text = new_text
                        
                        # Apply font size 9 for specific placeholders
                        target_placeholders = [
                            "{{Initial/Pre-Inspection}}",
                            "{{External}}",
                            "{{Internal}}",
                            "{{NON-DESTRUCTIVE TESTING}}",
                            "{{RECOMMENDATION}}"
                        ]
                        if key in target_placeholders:
                            try:
                                runs_to_clear[0].font.size = Pt(9)
                                print(f"   📏 Applied font size 9 to {key}")
                            except Exception as e:
                                print(f"   ⚠️ Failed to set font size for {key}: {e}")
                                
                    return True
        return False

    # 1. Process paragraphs
    for paragraph in doc.paragraphs:
        replace_in_paragraph(paragraph, data)

    # 2. Process tables
    for table in doc.tables:
        table_has_photo_placeholder = False
        photo_row_index = -1

        # Find photo placeholder
        for row_idx, row in enumerate(table.rows):
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    if "{{Photo}}" in paragraph.text:
                        table_has_photo_placeholder = True
                        photo_row_index = row_idx
                        break
                if table_has_photo_placeholder:
                    break
            if table_has_photo_placeholder:
                break

        if table_has_photo_placeholder and photo_entries:
            print(f"✅ Found photo table with {len(photo_entries)} entries to process")
            print(f"📍 Template row is at index: {photo_row_index}")

            from copy import deepcopy

            template_row = table.rows[photo_row_index]
            original_row_count = len(table.rows)

            print(f"📊 Table has {original_row_count} rows before processing")

            # First, add all the new rows we need (except the first one which already exists)
            new_rows_to_add = len(photo_entries) - 1

            for i in range(new_rows_to_add):
                print(f"➕ Adding new row {i+2}...")
                new_tr = deepcopy(template_row._element)

                # --- FIX: Regenerate IDs for drawing objects (Textboxes/Images) ---
                # Duplicate IDs cause "File Corrupted" error in Word
                all_doc_prs = new_tr.xpath(".//*[local-name()='docPr']")
                for doc_pr in all_doc_prs:
                    new_id = str(random.randint(100000, 999999999))
                    doc_pr.set("id", new_id)
                    # Update name too to be safe
                    if doc_pr.get("name"):
                        doc_pr.set("name", f"Object {new_id}")
                    print(f"   🔧 Regenerated object ID to {new_id}")

                table._element.append(new_tr)

            print(f"📊 Table now has {len(table.rows)} rows after adding")

            # Now fill all the rows (starting from the template row index)
            for i, entry in enumerate(photo_entries):
                row_index = photo_row_index + i
                current_row = table.rows[row_index]

                print(f"📝 Processing entry {i+1} into row index {row_index}")

                # --- Helper to process text boxes ---
                def process_textboxes_in_row(row_element, entry_index):
                    # Find w:p inside w:txbxContent
                    txbx_paras = row_element.xpath(".//w:txbxContent//w:p")
                    for p_elem in txbx_paras:
                        try:
                            # Wrap in Paragraph to use standard run access
                            para = Paragraph(
                                p_elem, current_row._parent
                            )  # _parent gives document usually? No, Table.
                            # Safe bet: pass the doc object if available?
                            # 'doc' is available in scope.
                            para = Paragraph(p_elem, doc)

                            full_text = "".join(run.text for run in para.runs)

                            # Handle {{Photo N}}
                            if "{{Photo N}}" in full_text or re.search(
                                r"Photo\s+\d+", full_text
                            ):
                                print(f"   📦 Found {{Photo N}} in Text Box!")
                                full_text = full_text.replace(
                                    "{{Photo N}}", f"Photo {entry_index+1}"
                                )
                                full_text = re.sub(
                                    r"Photo\s+\d+", f"Photo {entry_index+1}", full_text
                                )

                                # Replace content
                                for run in para.runs:
                                    run.text = ""
                                if para.runs:
                                    para.runs[0].text = full_text
                                else:
                                    para.add_run(full_text)
                        except Exception as e:
                            print(f"   ⚠️ Error processing text box: {e}")

                # Process text boxes in this row
                process_textboxes_in_row(current_row._element, i)

                # Handle cases where {{Photo N}} might be split across multiple runs
                first_cell = current_row.cells[0]
                for para in first_cell.paragraphs:
                    # Combine all runs to check for placeholder
                    full_text = "".join(run.text for run in para.runs)
                    original_text = full_text

                    # 1. Update "{{Photo N}}" to "Photo N"
                    if "{{Photo N}}" in full_text or re.search(
                        r"Photo\s+\d+", full_text
                    ):
                        full_text = full_text.replace("{{Photo N}}", f"Photo {i+1}")
                        full_text = re.sub(r"Photo\s+\d+", f"Photo {i+1}", full_text)

                    # 2. Update "{{Component}}"
                    if "{{Component}}" in full_text:
                        comp_val = entry.get("component", "")
                        full_text = full_text.replace("{{Component}}", comp_val)
                        print(f"   🔄 Replaced {{Component}} with: '{comp_val}'")

                    # Apply changes if text changed
                    if full_text != original_text:
                        # Clear all runs and put new text in first run
                        for run in para.runs:
                            run.text = ""
                        if para.runs:
                            para.runs[0].text = full_text
                        else:
                            para.add_run(full_text)
                        print(f"   ✏️ Updated paragraph text for entry {i+1}")

                # Replace {{Photo}} with actual image
                image_inserted = False
                for para in first_cell.paragraphs:
                    if "{{Photo}}" in para.text:
                        # Remove {{Photo}} text
                        for run in para.runs:
                            if "{{Photo}}" in run.text:
                                run.text = run.text.replace("{{Photo}}", "")

                        # Add image
                        img_str = entry.get("photo", "")
                        if img_str and img_str.startswith("data:image"):
                            try:
                                header, encoded = img_str.split(",", 1)
                                image_data = base64.b64decode(encoded)
                                image_stream = io.BytesIO(image_data)
                                run = para.add_run()
                                run.add_picture(image_stream, width=Inches(2.0))  #
                                image_inserted = True
                                print(f"   🖼️ Inserted image for entry {i+1}")
                            except Exception as e:
                                print(f"   ❌ Image error: {e}")
                                para.add_run("[Image Error]")
                        else:
                            para.add_run("[No Image]")
                            print(f"   ⚠️ No image data for entry {i+1}")
                        break

                if not image_inserted and not entry.get("photo"):
                    print(f"   ℹ️ Entry {i+1} has no image")

                # Replace both {{Finding}} and {{Recommendation}} in cell 1
                if len(current_row.cells) > 1:
                    print(f"   🔍 DEBUG: Processing cell 1 (Finding + Recommendation)")

                    for para in current_row.cells[1].paragraphs:
                        combined = "".join(run.text for run in para.runs)
                        print(
                            f"   🔍 DEBUG: Cell 1 paragraph text: '{combined[:100]}...'"
                        )

                        # Check if this paragraph has placeholders
                        has_finding = "{{Finding}}" in combined
                        has_recommendation = "{{Recommendation}}" in combined

                        if has_finding or has_recommendation:
                            new_text = combined

                            # Replace Finding placeholder
                            if has_finding:
                                new_text = new_text.replace(
                                    "{{Finding}}", entry.get("finding", "")
                                )
                                print(
                                    f"   ✅ Replaced {{{{Finding}}}} with: '{entry.get('finding', '')[:50]}...'"
                                )

                            # Replace Recommendation placeholder
                            if has_recommendation:
                                new_text = new_text.replace(
                                    "{{Recommendation}}",
                                    entry.get("recommendation", ""),
                                )
                                print(
                                    f"   ✅ Replaced {{{{Recommendation}}}} with: '{entry.get('recommendation', '')[:50]}...'"
                                )

                            # Update the paragraph with the new text
                            for run in para.runs:
                                run.text = ""
                            if para.runs:
                                para.runs[0].text = new_text
                            else:
                                para.add_run(new_text)

                    print(
                        f"   � Updated cell 1 (Finding + Recommendation) for entry {i+1}"
                    )

            print(f"✅ Finished processing photo table")

        else:
            # Normal table processing
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        replace_in_paragraph(paragraph, data)

    # 3. Process headers/footers
    for section in doc.sections:
        for header in [section.header, section.first_page_header]:
            for paragraph in header.paragraphs:
                replace_in_paragraph(paragraph, data)
            for table in header.tables:
                for row in table.rows:
                    for cell in row.cells:
                        for paragraph in cell.paragraphs:
                            replace_in_paragraph(paragraph, data)

    return doc


def clean_temp_files(directory):
    """Clean up temporary Word lock files"""
    # Create pattern for temporary files (~$*)
    temp_pattern = os.path.join(directory, "~$*")

    # Find and delete temporary files
    for temp_file in glob.glob(temp_pattern):
        try:
            os.remove(temp_file)
            print(f"Cleaned up temporary file: {temp_file}")
        except Exception as e:
            print(f"Could not delete {temp_file}: {e}")


@app.route("/api/generate-document", methods=["POST"])
def generate_document():
    """
    Generate filled Word document and optionally convert to PDF
    Expected JSON:
    {
        "data": { "{{Placeholder}}": "Value", ... },
        "format": "docx" or "pdf",
        "filename": "optional-custom-name"
    }
    """
    try:
        print("=" * 50)
        print("REQUEST RECEIVED")
        print("=" * 50)

        request_data = request.json
        data = request_data.get("data", {})
        output_format = request_data.get("format", "docx")
        custom_filename = request_data.get(
            "filename", f"document_{uuid.uuid4().hex[:8]}"
        )

        print(f"Placeholders to fill: {len(data)}")
        print(f"Output format: {output_format}")

        # Template path - relative to script location
        template_path = "Templet PDF Project Placeholder.docx"

        if not os.path.exists(template_path):
            print("ERROR: Template not found!")
            return (
                jsonify(
                    {
                        "error": "Template not found",
                        "path": os.path.abspath(template_path),
                    }
                ),
                404,
            )

        print("✓ Template found")

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            # Fill the template using the EXACT SAME function as your working script
            print("Filling template...")
            doc = fill_template(template_path, data)

            # Save filled docx
            docx_path = os.path.abspath(
                os.path.join(temp_dir, f"{custom_filename}.docx")
            )
            doc.save(docx_path)
            print("✓ DOCX saved successfully")

            # Clean up any temp files
            clean_temp_files(temp_dir)

            # Convert to PDF if requested
            if output_format == "pdf":
                pdf_path = os.path.abspath(
                    os.path.join(temp_dir, f"{custom_filename}.pdf")
                )
                print("Converting to PDF...")
                try:
                    # Initialize COM for this thread
                    pythoncom.CoInitializeEx(pythoncom.COINIT_APARTMENTTHREADED)

                    # Give file system a moment to sync
                    time.sleep(1)

                    convert(docx_path, pdf_path)
                    print("✓ PDF converted successfully")

                    # Read PDF into memory BEFORE temp dir cleanup
                    with open(pdf_path, "rb") as f:
                        pdf_data = f.read()

                    print("✓ Sending PDF file")
                    # Send from memory to avoid file locking
                    return send_file(
                        BytesIO(pdf_data),
                        mimetype="application/pdf",
                        as_attachment=True,
                        download_name=f"{custom_filename}.pdf",
                    )
                except Exception as e:
                    print("PDF CONVERSION ERROR:", str(e))

                    # Save the failed file for debugging
                    failed_dir = os.path.join(
                        os.path.dirname(os.path.abspath(__file__)), "failed_docs"
                    )
                    os.makedirs(failed_dir, exist_ok=True)
                    failed_path = os.path.join(
                        failed_dir, f"FAILED_{custom_filename}.docx"
                    )
                    shutil.copy2(docx_path, failed_path)
                    print(f"⚠️ Saved failed document to: {failed_path}")

                    import traceback

                    traceback.print_exc()
                    return jsonify({"error": f"PDF conversion failed: {str(e)}"}), 500
                finally:
                    # Uninitialize COM to prevent threading issues
                    pythoncom.CoUninitialize()
            else:
                # Read DOCX into memory BEFORE temp dir cleanup
                with open(docx_path, "rb") as f:
                    docx_data = f.read()

                print("✓ Sending DOCX file")
                # Send from memory to avoid file locking
                return send_file(
                    BytesIO(docx_data),
                    mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    as_attachment=True,
                    download_name=f"{custom_filename}.docx",
                )

    except Exception as e:
        print("=" * 50)
        print("ERROR OCCURRED:")
        print("=" * 50)
        print(str(e))
        import traceback

        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "document-generator"})


@app.route("/api/preview-placeholders", methods=["GET"])
def preview_placeholders():
    """Get all placeholders from template"""
    try:
        template_path = "Templet PDF Project Placeholder.docx"

        if not os.path.exists(template_path):
            return jsonify({"error": "Template not found"}), 404

        doc = Document(template_path)

        placeholders = set()

        # Find all text with {{ }}
        for paragraph in doc.paragraphs:
            found = re.findall(r"\{\{[^}]+\}\}", paragraph.text)
            placeholders.update(found)

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        found = re.findall(r"\{\{[^}]+\}\}", paragraph.text)
                        placeholders.update(found)

        return jsonify({"placeholders": sorted(list(placeholders))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/test-fill", methods=["GET"])
def test_fill():
    """Test endpoint with same data as your working script"""
    data = {
        "{{Equipment tag no}}": "EQ-12345",
        "{{Equipment description}}": "High-Performance Pump",
        "{{Report no}}": "RPT-67890",
        "{{Report date}}": "2024-06-15",
        "{{Plant/Unit/Area}}": "Central Processing Unit",
        "{{DOSH registration no}}": "DOSH-54321",
        "{{Initial/Pre-Inspection}}": "Not applicable",
        "{{External}}": """1.1 In general, equipment was found fully coated. All associate parts were noted on their positions and in satisfactory condition.
1.2 Nameplate and PMT number were intact and legible.
1.3 Concrete foundation and supports were satisfactory.""",
        "{{Internal}}": """2.1 Internal of manhole cover noted with mechanical marks at 4 o'clock position (acceptable as per ASME PCC1).
2.2 Manhole flange dented at 1 o'clock position (approx. 3 mm).""",
        "{{NON-DESTRUCTIVE TESTING}}": "UTTM: No significant wall loss detected compared to nominal thickness.",
        "{{RECOMMENDATION}}": """2.3: To be monitored on next opportunity.
2.5: To be monitored on next opportunity.""",
        "{{Inspected by}}": "Ahmad Zaki Bin Abdul Rahman",
        "{{Photo}}": "[PHOTO PLACEHOLDER - Insert image here]",
        "{{Finding}}": """1.1 In general, equipment was found fully coated. All associate parts were noted on their positions and in satisfactory condition.
1.2 Nameplate and PMT number were intact and legible.
1.3 Concrete foundation and supports were satisfactory.
2.1 Internal of manhole cover noted with mechanical marks at 4 o'clock position.
2.2 Manhole flange dented at 1 o'clock position (approx. 3 mm).""",
        "{{Recommendation}}": """1. All findings are within acceptable limits.
2. Minor dents to be monitored during next inspection.
3. Continue with regular maintenance schedule.
4. Next inspection scheduled for 2025.""",
        "photoEntries": [
            {
                "photo": "",
                "finding": "Test Finding 1",
                "recommendation": "Test Recommendation 1",
                "component": "Component A",
            },
            {
                "photo": "",
                "finding": "Test Finding 2",
                "recommendation": "Test Recommendation 2",
                "component": "Component B",
            },
        ],
    }

    try:
        template_path = "Templet PDF Project Placeholder.docx"

        with tempfile.TemporaryDirectory() as temp_dir:
            doc = fill_template(template_path, data)
            docx_path = os.path.join(temp_dir, "test_filled.docx")
            doc.save(docx_path)

            with open(docx_path, "rb") as f:
                docx_data = f.read()

            return send_file(
                BytesIO(docx_data),
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                as_attachment=True,
                download_name="test_filled.docx",
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("🚀 Document Generator API starting...")
    print("📝 Template should be at: Templet PDF Project Placeholder.docx")
    print("🌐 API available at: http://localhost:5001")
    print("✅ Health check: http://localhost:5001/api/health")
    print("🧪 Test fill: http://localhost:5001/api/test-fill")
    print()

    # Check if template exists
    if os.path.exists("Templet PDF Project Placeholder.docx"):
        print("✅ Template found!")
    else:
        print("⚠️  WARNING: Template not found at current location")
        print(f"   Looking in: {os.path.abspath('.')}")

    print()
    app.run(host="0.0.0.0", debug=True, port=5001)
