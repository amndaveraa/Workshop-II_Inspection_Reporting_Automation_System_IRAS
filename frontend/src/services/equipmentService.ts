const API = import.meta.env.VITE_API_URL;

export const vesselService = {
  getMetadata: async () => {
    const response = await fetch(`${API}/vessels/metadata`);
    return response.json();
  },

  submitVessel: async (payload: any) => {
    const response = await fetch(`${API}/vessels/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  updateVessel: async (id: string, payload: any) => {
    const response = await fetch(`${API}/vessels/update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  addPlant: async (name: string) => {
    const response = await fetch(`${API}/vessels/plant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return response.json();
  }
};