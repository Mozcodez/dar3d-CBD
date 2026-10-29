export interface CityStory {
  id: string;
  title: string;
  chapter: string;
  coordinates: [number, number];
  osm: string;
  story: string;
  source: { label: string; url: string };
}

export const cityStories: CityStory[] = [
  {
    id: 'askari', title: 'Askari Monument', chapter: '01 · MEMORY', coordinates: [39.28948, -6.81663], osm: 'node/273348341',
    story: 'At the city’s centre, the Askari Monument remembers African carriers who served in the First World War. The bronze askari stands above a memorial whose inscription names the African troops and carriers who died in that conflict. Later research has drawn attention to the many carriers commemorated without individual names. The monument is a landmark and a place to pause over whose stories enter the public record.',
    source: { label: 'Commonwealth War Graves Commission · Dar es Salaam memorial research (2024)', url: 'https://www.cwgc.org/media/gfjdpwxp/non-commemoration-programme-research-report-2024-dar-es-salaam.pdf' },
  },
  {
    id: 'clock-tower', title: 'Clock Tower', chapter: '02 · CITYHOOD', coordinates: [39.28386, -6.82158], osm: 'node/4477383090',
    story: 'This roundabout landmark marks a turning point in Dar es Salaam’s civic story. The African Development Bank’s environmental study records that the Clock Tower was built to mark the city’s elevation to city status in December 1961. Its position ties everyday movement through the centre to a formal change in how Dar es Salaam was recognized and governed.',
    source: { label: 'African Development Bank · Dar es Salaam BRT ESIA (2015)', url: 'https://www.afdb.org/sites/default/files/documents/environmental-and-social-assessments/tanzania_-_dar_es_salaam_brt_project_esia_phase_2_3_report_-_04_2015.pdf' },
  },
  {
    id: 'kariakoo', title: 'Kariakoo Market', chapter: '03 · DAILY LIFE', coordinates: [39.2753, -6.81929], osm: 'node/7615449194',
    story: 'Kariakoo Market is a working landmark in a district shaped around exchange. Tanzania’s National Museum magazine dates development of the market to 1970 and describes a building organized across basement, ground and first floors. Today the surrounding streets connect wholesale trade, small shops and everyday errands. This stop follows the market’s documented building history while leaving room for the daily stories only its vendors and visitors can tell.',
    source: { label: 'National Museum of Tanzania · Finest Attractions magazine', url: 'https://www.nmt.go.tz/uploads/documents/sw-1701943813-NATIONAL%20MUSEUM%20OF%20TANZANIA%20-%20FINEST%20ATTRACTIONS%20MAGAZINE.pdf' },
  },
  {
    id: 'kivukoni-fish-market', title: 'Kivukoni Fish Market', chapter: '04 · THE WATERFRONT', coordinates: [39.30026, -6.8181], osm: 'way/140358114',
    story: 'Kivukoni’s edge is a place where the city meets working water. A JICA study describes Kivukoni Front as a main mooring shore for fishing boats, with the fish market and ferry nearby. The harbour is infrastructure and livelihood at once: boats arrive, people trade, and the central city faces across the water toward Kigamboni.',
    source: { label: 'JICA · Dar es Salaam transport and waterfront planning report', url: 'https://openjicareport.jica.go.jp/pdf/11688686_07.pdf' },
  },
  {
    id: 'kigamboni-ferry', title: 'Kigamboni Ferry', chapter: '05 · CROSSING', coordinates: [39.29708, -6.81989], osm: 'node/277494810',
    story: 'At the harbour, the Kigamboni ferry makes the water part of the city’s daily geography. The crossing links the central waterfront with Kigamboni and its communities. This map marks the terminal as a story stop; it does not claim live departures, travel times or a current ferry track. The documented ferry context comes from a planning study, while the terminal location follows OpenStreetMap.',
    source: { label: 'JICA · Dar es Salaam transport and waterfront planning report', url: 'https://openjicareport.jica.go.jp/pdf/11688686_07.pdf' },
  },
];

