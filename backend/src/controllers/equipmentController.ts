import { Request, Response } from 'express';
import supabase from '../config/supabaseClient';
import * as equipmentService from '../services/equipmentService';

export const addVessel = async (req: Request, res: Response) => {
  const { equipmentData, components } = req.body;

  try {
    const { data: equipment, error: eqError } = await supabase
      .from('equipment')
      .insert([equipmentData])
      .select()
      .single();

    if (eqError) throw eqError;

    if (components && components.length > 0) {
      const linkedComponents = components.map((comp: any) => ({
        ...comp,
        equipmentid: equipment.equipmentid
      }));

      const { error: compError } = await supabase
        .from('component')
        .insert(linkedComponents);

      if (compError) throw compError;
    }

    return res.status(201).json({
      success: true,
      message: 'Vessel and components added successfully',
      data: equipment
    });

  } catch (error: any) {
    console.error('Error adding vessel:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
};

export const addNewPlant = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: "Plant name is required" });
  }

  try {
    const { data, error } = await supabase
      .from('plant')
      .insert([{ name: name.trim() }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVesselFormMetadata = async (_req: Request, res: Response) => {
  try {
    const { data: plants } = await supabase.from('plant').select('*');
    const { data: vesselTypes } = await supabase.from('vesseltype').select('*');
    return res.status(200).json({ plants, vesselTypes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllVessels = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        equipmentid,
        image, 
        tagno,
        name,
        vesseltypeid,
        plantid,
        vesseltype:vesseltypeid (name),
        plant:plantid (name), 
        status,
        doshregno,
        capacity,
        installationdate,
        "lastInspectionDate", 
        component (name, type, tagno)
      `);

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVesselStatCounts = async (req: Request, res: Response) => {
  try {
    const { total, active, inactive } = await equipmentService.fetchEquipmentStatsCounts();
    if (total.error) throw new Error(total.error.message);
    if (active.error) throw new Error(active.error.message);
    if (inactive.error) throw new Error(inactive.error.message);

    res.status(200).json({
      total: total.count || 0,
      active: active.count || 0,
      inactive: inactive.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateVessel = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = rawId?.trim();
  const { image, name, tagno, doshregno, plantid, vesseltypeid, status } = req.body;

  try {
    // 1. Check if row exists
    const { data: existing, error: findError } = await supabase
      .from('equipment')
      .select('equipmentid')
      .eq('equipmentid', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) {
      return res.status(404).json({ success: false, message: "Vessel not found" });
    }

    // 2. Build Dynamic Payload
    const sanitizeUuid = (val: any) => (val && typeof val === 'string' && val.trim().length > 0) ? val.trim() : null;
    const updatePayload: Record<string, any> = {};
    
    if (image !== undefined) updatePayload.image = image;
    if (name !== undefined) updatePayload.name = name?.trim();
    if (tagno !== undefined) updatePayload.tagno = tagno?.trim();
    if (doshregno !== undefined) updatePayload.doshregno = doshregno?.trim();
    if (plantid !== undefined) updatePayload.plantid = sanitizeUuid(plantid);
    if (vesseltypeid !== undefined) updatePayload.vesseltypeid = sanitizeUuid(vesseltypeid);
    if (status !== undefined) updatePayload.status = status.toLowerCase();

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    // 3. Perform Update
    const { data, error } = await supabase
      .from('equipment')
      .update(updatePayload)
      .eq('equipmentid', id)
      .select();

    if (error) throw error;
    
    return res.status(200).json({ 
        success: true, 
        message: "Vessel updated successfully",
        data 
    });
  } catch (error: any) {
    console.error("Update Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVessel = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('equipmentid', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Vessel deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};