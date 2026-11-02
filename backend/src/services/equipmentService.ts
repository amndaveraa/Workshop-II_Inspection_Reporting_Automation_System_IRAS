import supabase from '../config/supabaseClient';

export const fetchEquipmentStatsCounts = async () => {
  const totalReq = supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true });

  const activeReq = supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const inactiveReq = supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'deactivated');

  const [total, active, inactive] = await Promise.all([
    totalReq, activeReq, inactiveReq
  ]);
  return { total, active, inactive };
};