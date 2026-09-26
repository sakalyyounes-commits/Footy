export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

/** Villes prédéfinies pour le calcul des horaires de prière. */
export const CITIES: City[] = [
  { id: 'casablanca', name: 'Casablanca', country: 'Maroc', lat: 33.5731, lng: -7.5898 },
  { id: 'rabat', name: 'Rabat', country: 'Maroc', lat: 34.0209, lng: -6.8416 },
  { id: 'sale', name: 'Salé', country: 'Maroc', lat: 34.0531, lng: -6.7985 },
  { id: 'temara', name: 'Témara', country: 'Maroc', lat: 33.9287, lng: -6.9063 },
  { id: 'kenitra', name: 'Kénitra', country: 'Maroc', lat: 34.261, lng: -6.5802 },
  { id: 'mohammedia', name: 'Mohammedia', country: 'Maroc', lat: 33.6866, lng: -7.383 },
  { id: 'eljadida', name: 'El Jadida', country: 'Maroc', lat: 33.2316, lng: -8.5007 },
  { id: 'settat', name: 'Settat', country: 'Maroc', lat: 33.001, lng: -7.6166 },
  { id: 'berrechid', name: 'Berrechid', country: 'Maroc', lat: 33.2655, lng: -7.5875 },
  { id: 'marrakech', name: 'Marrakech', country: 'Maroc', lat: 31.6295, lng: -7.9811 },
  { id: 'fes', name: 'Fès', country: 'Maroc', lat: 34.0181, lng: -5.0078 },
  { id: 'meknes', name: 'Meknès', country: 'Maroc', lat: 33.8935, lng: -5.5473 },
  { id: 'ifrane', name: 'Ifrane', country: 'Maroc', lat: 33.5228, lng: -5.1106 },
  { id: 'tanger', name: 'Tanger', country: 'Maroc', lat: 35.7595, lng: -5.834 },
  { id: 'tetouan', name: 'Tétouan', country: 'Maroc', lat: 35.5889, lng: -5.3626 },
  { id: 'larache', name: 'Larache', country: 'Maroc', lat: 35.1932, lng: -6.1557 },
  { id: 'alhoceima', name: 'Al Hoceïma', country: 'Maroc', lat: 35.2517, lng: -3.9372 },
  { id: 'nador', name: 'Nador', country: 'Maroc', lat: 35.1681, lng: -2.9335 },
  { id: 'oujda', name: 'Oujda', country: 'Maroc', lat: 34.6814, lng: -1.9086 },
  { id: 'taza', name: 'Taza', country: 'Maroc', lat: 34.21, lng: -4.01 },
  { id: 'khemisset', name: 'Khémisset', country: 'Maroc', lat: 33.824, lng: -6.066 },
  { id: 'benimellal', name: 'Béni Mellal', country: 'Maroc', lat: 32.3373, lng: -6.3498 },
  { id: 'khouribga', name: 'Khouribga', country: 'Maroc', lat: 32.8811, lng: -6.9063 },
  { id: 'safi', name: 'Safi', country: 'Maroc', lat: 32.2994, lng: -9.2372 },
  { id: 'essaouira', name: 'Essaouira', country: 'Maroc', lat: 31.5085, lng: -9.7595 },
  { id: 'agadir', name: 'Agadir', country: 'Maroc', lat: 30.4278, lng: -9.5981 },
  { id: 'taroudant', name: 'Taroudant', country: 'Maroc', lat: 30.4703, lng: -8.877 },
  { id: 'tiznit', name: 'Tiznit', country: 'Maroc', lat: 29.6974, lng: -9.7316 },
  { id: 'ouarzazate', name: 'Ouarzazate', country: 'Maroc', lat: 30.9189, lng: -6.8934 },
  { id: 'errachidia', name: 'Errachidia', country: 'Maroc', lat: 31.9314, lng: -4.4247 },
  { id: 'guelmim', name: 'Guelmim', country: 'Maroc', lat: 28.987, lng: -10.0574 },
  { id: 'laayoune', name: 'Laâyoune', country: 'Maroc', lat: 27.1253, lng: -13.1625 },
  { id: 'dakhla', name: 'Dakhla', country: 'Maroc', lat: 23.6848, lng: -15.958 },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { id: 'lyon', name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357 },
  { id: 'marseille', name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698 },
  { id: 'bruxelles', name: 'Bruxelles', country: 'Belgique', lat: 50.8503, lng: 4.3517 },
  { id: 'amsterdam', name: 'Amsterdam', country: 'Pays-Bas', lat: 52.3676, lng: 4.9041 },
  { id: 'madrid', name: 'Madrid', country: 'Espagne', lat: 40.4168, lng: -3.7038 },
  { id: 'barcelone', name: 'Barcelone', country: 'Espagne', lat: 41.3874, lng: 2.1686 },
  { id: 'milan', name: 'Milan', country: 'Italie', lat: 45.4642, lng: 9.19 },
  { id: 'londres', name: 'Londres', country: 'Royaume-Uni', lat: 51.5072, lng: -0.1276 },
  { id: 'montreal', name: 'Montréal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { id: 'dubai', name: 'Dubaï', country: 'Émirats', lat: 25.2048, lng: 55.2708 },
  { id: 'lamecque', name: 'La Mecque', country: 'Arabie saoudite', lat: 21.4225, lng: 39.8262 },
  { id: 'medine', name: 'Médine', country: 'Arabie saoudite', lat: 24.4686, lng: 39.6142 },
];

export function findCity(id: string | null): City | undefined {
  return id ? CITIES.find((c) => c.id === id) : undefined;
}
