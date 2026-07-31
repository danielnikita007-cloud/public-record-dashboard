// Approximate centroid coordinates for Indian states/UTs.
// Used to auto-plot a case on the map from its `state` field alone, when
// no precise lat/lng was given. Good enough for a state-level bubble map;
// NOT precise enough for anything claiming exact incident locations.
export const STATE_COORDS: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9129, 79.74],
  "Arunachal Pradesh": [28.218, 94.7278],
  "Assam": [26.2006, 92.9376],
  "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661],
  "Goa": [15.2993, 74.124],
  "Gujarat": [22.2587, 71.1924],
  "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734],
  "Jharkhand": [23.6102, 85.2799],
  "Karnataka": [15.3173, 75.7139],
  "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569],
  "Maharashtra": [19.7515, 75.7139],
  "Manipur": [24.6637, 93.9063],
  "Meghalaya": [25.467, 91.3662],
  "Mizoram": [23.1645, 92.9376],
  "Nagaland": [26.1584, 94.5624],
  "Odisha": [20.9517, 85.0985],
  "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179],
  "Sikkim": [27.533, 88.5122],
  "Tamil Nadu": [11.1271, 78.6569],
  "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Uttarakhand": [30.0668, 79.0193],
  "West Bengal": [22.9868, 87.855],
  "Delhi": [28.7041, 77.1025],
  "Jammu and Kashmir": [33.7782, 76.5762],
  "Ladakh": [34.1526, 77.5771],
  "Chandigarh": [30.7333, 76.7794],
  "Puducherry": [11.9416, 79.8083],
};

export function coordsForState(state?: string): [number, number] | null {
  if (!state) return null;
  const match = Object.keys(STATE_COORDS).find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );
  return match ? STATE_COORDS[match] : null;
}
