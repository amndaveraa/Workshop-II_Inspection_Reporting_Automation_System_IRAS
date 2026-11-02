import supabase from '../config/supabaseClient';
import { Employee } from '../models/Employee';
import jwt from "jsonwebtoken";

export const updateEmployeeProfile = async (employeeid: string, name: string, phoneNum: string) => {
    const { data, error } = await supabase
        .from('employee')
        .update({ 
            name, 
            phoneNum
        })
        .eq('employeeid', employeeid)
        .select()
        .single();
        
    if (error) {
        throw new Error(error.message);
    }

    return data;
};

export const updateEmployeePassword = async (employeeid: string, passwordHash: string) => {
    const { error } = await supabase
        .from('employee')
        .update({ hashedPassword: passwordHash })
        .eq('employeeid', employeeid);

    if (error) throw new Error(error.message);
    return true;
};

export const getEmployeeById = async (employeeid: string) => {
    const { data, error } = await supabase
        .from('employee')
        .select('*')
        .eq('employeeid', employeeid)
        .single();

    if (error) {
        throw new Error("Employee not found");
    }

    return data;
};

export const updateEmployeeAvatar = async (employeeid: string, file: any) => {
    // 1. Get the current user record
    const { data: currentEmployee } = await supabase
        .from('employee')
        .select('avatarUrl')
        .eq('employeeid', employeeid)
        .single();

    // 2. DELETE OLD IMAGE FROM BUCKET
    if (currentEmployee?.avatarUrl) {
        try {
            const urlParts = currentEmployee.avatarUrl.split('/');
            const lastPart = urlParts[urlParts.length - 1]; 
            const oldFileName = lastPart.split('?')[0];

            if (oldFileName) {
                console.log("DEBUG: Target file to delete:", oldFileName);
                
                const { data: delData, error: delError } = await supabase.storage
                    .from('avatars')
                    .remove([oldFileName]);
                
                // --- LOGGING THE RESULT ---
                if (delError) {
                    console.error("DEBUG: Delete failed!", delError.message);
                } else if (delData && delData.length > 0) {
                    console.log("DEBUG: Delete success! Deleted files:", delData);
                } else {
                    // This happens if the file wasn't found in the bucket
                    console.warn("DEBUG: Delete call finished, but no file was removed (File might not exist in bucket).");
                }
            }
        } catch (err) {
            console.error("DEBUG: Cleanup logic crashed:", err);
        }
    }

    // 3. UPLOAD NEW IMAGE
    const fileExtension = file.originalname.split('.').pop();
    const newFileName = `${employeeid}-${Date.now()}.${fileExtension}`;
    console.log("DEBUG: Uploading new file as:", newFileName);

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(newFileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

    if (uploadError) throw new Error(uploadError.message);

    // 4. GET NEW PUBLIC URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(newFileName);

    // 5. UPDATE DATABASE
    const { data, error: dbError } = await supabase
        .from('employee')
        .update({ avatarUrl: urlData.publicUrl })
        .eq('employeeid', employeeid)
        .select()
        .single();

    if (dbError) throw new Error(dbError.message);

    return data;
};