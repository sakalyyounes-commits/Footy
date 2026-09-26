import type { FinanceCategory } from '../store/types';

/** Catégories créées au premier lancement (modifiables dans l'application). */
export const DEFAULT_CATEGORIES: FinanceCategory[] = [
  { id: 'logement', name: 'Logement', type: 'expense', emoji: '🏠', budget: null },
  { id: 'courses', name: 'Courses', type: 'expense', emoji: '🛒', budget: null },
  { id: 'restaurants', name: 'Restaurants & cafés', type: 'expense', emoji: '🍽️', budget: null },
  { id: 'transport', name: 'Transport', type: 'expense', emoji: '🚗', budget: null },
  { id: 'factures', name: 'Factures', type: 'expense', emoji: '💡', budget: null },
  { id: 'telephone', name: 'Abonnements', type: 'expense', emoji: '📱', budget: null },
  { id: 'sante', name: 'Santé', type: 'expense', emoji: '🩺', budget: null },
  { id: 'sport', name: 'Sport', type: 'expense', emoji: '🏋️', budget: null },
  { id: 'shopping', name: 'Shopping', type: 'expense', emoji: '👕', budget: null },
  { id: 'loisirs', name: 'Loisirs', type: 'expense', emoji: '🎉', budget: null },
  { id: 'famille', name: 'Famille', type: 'expense', emoji: '👨‍👩‍👧', budget: null },
  { id: 'sadaqa', name: 'Sadaqa & dons', type: 'expense', emoji: '🤲', budget: null },
  { id: 'education', name: 'Éducation', type: 'expense', emoji: '📚', budget: null },
  { id: 'voyages', name: 'Voyages', type: 'expense', emoji: '✈️', budget: null },
  { id: 'cadeaux', name: 'Cadeaux', type: 'expense', emoji: '🎁', budget: null },
  { id: 'divers', name: 'Divers', type: 'expense', emoji: '📦', budget: null },
  { id: 'salaire', name: 'Salaire', type: 'income', emoji: '💼', budget: null },
  { id: 'primes', name: 'Commissions & primes', type: 'income', emoji: '📈', budget: null },
  { id: 'extra', name: 'Freelance & extras', type: 'income', emoji: '💻', budget: null },
  { id: 'cadeaux-recus', name: 'Cadeaux reçus', type: 'income', emoji: '🎁', budget: null },
  { id: 'autres-revenus', name: 'Autres revenus', type: 'income', emoji: '💰', budget: null },
];

/** Emojis proposés pour créer une catégorie ou un objectif d'épargne. */
export const FINANCE_EMOJIS = [
  '🏠', '🛒', '🍽️', '☕', '🚗', '🚕', '⛽', '💡', '📱', '🩺', '💊', '🏋️', '👕', '👟', '🎉', '🎮',
  '👨‍👩‍👧', '👶', '🤲', '🕌', '📚', '🎓', '✈️', '🏖️', '🎁', '🐱', '🔧', '💻', '📦', '💼', '📈', '💰',
  '🏦', '🪙', '🚀', '🏍️', '💍', '🐑', '🕋', '🛡️',
];
