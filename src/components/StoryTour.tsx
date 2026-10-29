import type { CityStory } from '../stories';

interface Props {
  story: CityStory | null;
  index: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function StoryTour({ story, index, onSelect, onClose }: Props) {
  return (
    <aside className={`story-tour${story ? ' is-open' : ''}`} aria-label="Dar es Salaam story tour">
      <div className="tour-heading">
        <div><span className="tour-kicker">A CITY IN FIVE MOMENTS</span><h2>Stories of Dar</h2></div>
        <button className="tour-close" type="button" onClick={story ? onClose : () => onSelect(0)} aria-label={story ? 'Close story' : 'Start story tour'}>{story ? '×' : 'Explore'}</button>
      </div>
      <div className="tour-stops" role="tablist" aria-label="Choose a story stop">
        {(['askari', 'clock-tower', 'kariakoo', 'kivukoni-fish-market', 'kigamboni-ferry']).map((id, i) => (
          <button key={id} className={`tour-stop${story?.id === id ? ' active' : ''}`} type="button" role="tab" aria-selected={story?.id === id} onClick={() => onSelect(i)} title={['Askari Monument', 'Clock Tower', 'Kariakoo Market', 'Kivukoni Fish Market', 'Kigamboni Ferry'][i]}>
            <span>{String(i + 1).padStart(2, '0')}</span><i />
          </button>
        ))}
      </div>
      {story ? <div className="story-body" role="tabpanel" key={story.id}>
        <span className="tour-kicker">{story.chapter} <span>·</span> {index + 1} / 5</span>
        <h3>{story.title}</h3>
        <p>{story.story}</p>
        <a className="story-source" href={story.source.url} target="_blank" rel="noreferrer">Read source <span aria-hidden="true">↗</span></a>
        <div className="story-actions">
          <button className="tour-arrow" type="button" onClick={() => onSelect((index + 4) % 5)} aria-label="Previous story">←</button>
          <button className="tour-arrow next" type="button" onClick={() => onSelect((index + 1) % 5)} aria-label="Next story">→</button>
        </div>
      </div> : <p className="tour-intro">Five stops from civic memory to the harbour. Choose a chapter to fly across the city.</p>}
    </aside>
  );
}
