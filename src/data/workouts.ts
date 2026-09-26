export interface WorkoutType {
  id: string;
  name: string;
  emoji: string;
  /** Équivalent métabolique (Compendium of Physical Activities), intensité modérée. */
  met: number;
  /** Afficher le champ distance. */
  distance?: boolean;
}

export const WORKOUT_TYPES: WorkoutType[] = [
  { id: 'musculation', name: 'Musculation', emoji: '🏋️', met: 5 },
  { id: 'course', name: 'Course à pied', emoji: '🏃', met: 9.8, distance: true },
  { id: 'marche', name: 'Marche', emoji: '🚶', met: 3.5, distance: true },
  { id: 'football', name: 'Football', emoji: '⚽', met: 7 },
  { id: 'futsal', name: 'Foot à 5', emoji: '🥅', met: 8 },
  { id: 'padel', name: 'Padel', emoji: '🎾', met: 6 },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', met: 7.3 },
  { id: 'basket', name: 'Basketball', emoji: '🏀', met: 6.5 },
  { id: 'velo', name: 'Vélo', emoji: '🚴', met: 7.5, distance: true },
  { id: 'natation', name: 'Natation', emoji: '🏊', met: 7, distance: true },
  { id: 'hiit', name: 'HIIT / circuit', emoji: '🔥', met: 8 },
  { id: 'boxe', name: 'Boxe / combat', emoji: '🥊', met: 7.8 },
  { id: 'cardio', name: 'Cardio (elliptique, rameur)', emoji: '🫀', met: 6 },
  { id: 'corde', name: 'Corde à sauter', emoji: '🪢', met: 11 },
  { id: 'randonnee', name: 'Randonnée', emoji: '🥾', met: 6, distance: true },
  { id: 'yoga', name: 'Yoga / pilates', emoji: '🧘', met: 3 },
  { id: 'mobilite', name: 'Étirements / mobilité', emoji: '🤸', met: 2.3 },
  { id: 'danse', name: 'Danse', emoji: '💃', met: 5 },
  { id: 'autre', name: 'Autre activité', emoji: '⭐', met: 5 },
];

export function workoutType(id: string): WorkoutType {
  return WORKOUT_TYPES.find((t) => t.id === id) ?? WORKOUT_TYPES[WORKOUT_TYPES.length - 1];
}

export const INTENSITY_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Légère',
  2: 'Modérée',
  3: 'Intense',
};
