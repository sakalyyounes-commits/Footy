import { parseCards } from '@ronda/core';
import { TopBar } from '../components/ui';
import { useT, type TranslationKey } from '../i18n';
import { useNav } from '../store/nav';
import { PlayingCard } from './game/PlayingCard';

const SECTIONS: { title: TranslationKey; body: TranslationKey; cards?: string }[] = [
  { title: 'rules.title', body: 'rules.intro', cards: '1o 2c 3e 4b 7o 10c 11e 12b' },
  { title: 'rules.dealer_title', body: 'rules.dealer', cards: '7o 2c 11e 5b' },
  { title: 'rules.deal_title', body: 'rules.deal' },
  { title: 'rules.capture_title', body: 'rules.capture', cards: '5o 5c 6e 7b 10o' },
  { title: 'rules.announce_title', body: 'rules.announce', cards: '11o 11c 3e 3b 3o' },
  { title: 'rules.darba_title', body: 'rules.darba', cards: '4o 4c 4e 4b' },
  { title: 'rules.missa_title', body: 'rules.missa' },
  { title: 'rules.lastcard_title', body: 'rules.lastcard', cards: '12o 12c' },
  { title: 'rules.end_title', body: 'rules.end' },
  { title: 'rules.tips_title', body: 'rules.tips' },
];

export function Rules() {
  const t = useT();
  const nav = useNav();
  return (
    <div className="screen">
      <TopBar title={t('home.rules')} onBack={nav.pop} />
      {SECTIONS.map((s, i) => (
        <section key={s.body} className={i === 0 ? 'panel-ornate rules-section' : 'panel rules-section'}>
          <h3>{t(s.title)}</h3>
          <p>{t(s.body)}</p>
          {s.cards && (
            <div className="rules-cards">
              {parseCards(s.cards).map((c) => (
                <PlayingCard key={c} card={c} width={40} shared={false} initial={false} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
