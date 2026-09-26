import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Tabs } from '../../components/ui/controls';
import { MonthNav, PageHeader } from '../../components/ui/layout';
import { monthKey, todayISO, type MonthKey } from '../../lib/dates';
import type { Transaction, TxType } from '../../store/types';
import { BudgetsTab } from './BudgetsTab';
import { OverviewTab } from './OverviewTab';
import { RecurringTab } from './RecurringTab';
import { SavingsTab } from './SavingsTab';
import { TransactionSheet } from './TransactionSheet';
import { TransactionsTab } from './TransactionsTab';

const TABS = [
  { value: 'apercu', label: 'Aperçu' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'budgets', label: 'Budgets' },
  { value: 'fixes', label: 'Charges fixes' },
  { value: 'epargne', label: 'Épargne' },
] as const;

type TabId = (typeof TABS)[number]['value'];

export function FinancePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('onglet');
  const tab: TabId = TABS.some((t) => t.value === raw) ? (raw as TabId) : 'apercu';
  const [month, setMonth] = useState<MonthKey>(monthKey(todayISO()));
  const [sheet, setSheet] = useState<{ open: boolean; tx: Transaction | null; type: TxType }>({ open: false, tx: null, type: 'expense' });

  // Raccourci « Nouvelle dépense » (écran d'accueil du téléphone) : ?ajout=depense
  useEffect(() => {
    const ajout = params.get('ajout');
    if (ajout === 'depense' || ajout === 'revenu') {
      setSheet({ open: true, tx: null, type: ajout === 'revenu' ? 'income' : 'expense' });
      const next = new URLSearchParams(params);
      next.delete('ajout');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const add = (type: TxType) => setSheet({ open: true, tx: null, type });

  return (
    <div className="stack-lg accent-finance">
      <PageHeader
        title="Finances"
        subtitle="Budget, dépenses, charges fixes et épargne"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => add('expense')}>
            <Plus size={16} /> Ajouter
          </button>
        }
      />
      <div>
        <Tabs
          ariaLabel="Sections"
          value={tab}
          onChange={(v) => setParams(v === 'apercu' ? {} : { onglet: v }, { replace: true })}
          tabs={TABS.map((t) => ({ value: t.value, label: t.label }))}
        />
        <div className="stack-lg">
          {tab !== 'epargne' && <MonthNav value={month} onChange={setMonth} />}
          {tab === 'apercu' && <OverviewTab month={month} onAdd={add} />}
          {tab === 'transactions' && <TransactionsTab month={month} onEdit={(tx) => setSheet({ open: true, tx, type: tx.type })} />}
          {tab === 'budgets' && <BudgetsTab month={month} />}
          {tab === 'fixes' && <RecurringTab month={month} />}
          {tab === 'epargne' && <SavingsTab />}
        </div>
      </div>
      <TransactionSheet open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} transaction={sheet.tx} defaultType={sheet.type} />
    </div>
  );
}
