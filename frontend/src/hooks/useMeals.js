/**
 * Owns today's and tomorrow's meals plus the one write the student portal
 * makes: saving a meal intention.
 *
 * Shared by the dashboard and the meals page so the save behaviour — optimistic
 * UI off, server response in, confirmation toast — is identical in both.
 */

import { useCallback, useState } from 'react';
import { studentApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useApi } from './useApi';

export function useMeals() {
  const { data, loading, error, reload, setData } = useApi(() => studentApi.meals(), []);
  const [savingKey, setSavingKey] = useState(null);
  const { notify } = useToast();

  /**
   * Sends the intention and replaces that meal with the server's version, so
   * what the student sees is always what the backend actually stored.
   */
  const saveIntent = useCallback(
    async (meal, intent) => {
      const key = `${meal.date}-${meal.id}`;
      setSavingKey(key);

      try {
        const response = await studentApi.setIntent(meal.id, intent, meal.date);
        const updated = response.meal;

        setData((current) => {
          if (!current) return current;
          const replaceIn = (day) => ({
            ...day,
            meals: day.meals.map((m) => (m.id === updated.id && m.date === updated.date ? updated : m)),
          });
          return { ...current, today: replaceIn(current.today), tomorrow: replaceIn(current.tomorrow) };
        });

        notify({
          variant: 'success',
          title: `${meal.name} preference saved`,
          text:
            intent === 'attending'
              ? `You're marked as attending. You can change this until ${meal.cutoffLabel}.`
              : 'Thanks for updating your meal preference.',
        });
        return true;
      } catch (err) {
        notify({
          variant: 'error',
          title: 'Could not save your response',
          text: err.message,
        });
        // The cutoff may have passed while the page was open — refresh quietly
        // so the card switches to its locked state.
        if (err.code === 'cutoff_passed') reload({ quiet: true });
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [notify, reload, setData]
  );

  return { data, loading, error, reload, saveIntent, savingKey };
}

/** Counts of each response state for a day — used by summary strips. */
export function summariseDay(meals = []) {
  return {
    attending: meals.filter((m) => m.studentIntent === 'attending').length,
    notAttending: meals.filter((m) => m.studentIntent === 'not_attending').length,
    pending: meals.filter((m) => m.studentIntent === 'none' && m.intentOpen).length,
    total: meals.length,
  };
}
