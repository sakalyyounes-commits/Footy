import { useSearchParams } from 'react-router';
import { Tabs } from '../../components/ui/controls';
import { PageHeader } from '../../components/ui/layout';
import { formatHijri, toHijri } from '../../lib/hijri';
import { useToday } from '../../lib/hooks';
import { useStore } from '../../store/store';
import { DhikrTab } from './DhikrTab';
import { FastTab } from './FastTab';
import { PrayersTab } from './PrayersTab';
import { QuranTab } from './QuranTab';
import { ToolsTab } from './ToolsTab';

const TABS = [
  { value: 'prieres', label: 'Prières' },
  { value: 'coran', label: 'Coran' },
  { value: 'dhikr', label: 'Adhkar & tasbih' },
  { value: 'jeune', label: 'Jeûne' },
  { value: 'outils', label: 'Qibla & zakat' },
] as const;

type TabId = (typeof TABS)[number]['value'];

export function DeenPage() {
  const today = useToday();
  const hijriOffset = useStore((s) => s.settings.prayer.hijriOffset);
  const [params, setParams] = useSearchParams();
  const raw = params.get('onglet');
  const tab: TabId = TABS.some((t) => t.value === raw) ? (raw as TabId) : 'prieres';

  return (
    <div className="stack-lg accent-deen">
      <PageHeader title="Dîn & prières" subtitle={formatHijri(toHijri(today, hijriOffset))} />
      <div>
        <Tabs
          ariaLabel="Sections"
          value={tab}
          onChange={(v) => setParams(v === 'prieres' ? {} : { onglet: v }, { replace: true })}
          tabs={TABS.map((t) => ({ value: t.value, label: t.label }))}
        />
        {tab === 'prieres' && <PrayersTab />}
        {tab === 'coran' && <QuranTab />}
        {tab === 'dhikr' && <DhikrTab />}
        {tab === 'jeune' && <FastTab />}
        {tab === 'outils' && <ToolsTab />}
      </div>
    </div>
  );
}
