import Link from "next/link";

const SOURCES = [
  { slug: "led-fastlane", name: "LED FastLane", url: "https://fastlaneng.louisianaeconomicdevelopment.com" },
  { slug: "la-itep", name: "Louisiana ITEP", url: "https://itep.louisiana.gov" },
  { slug: "la-bd-ci", name: "LA BCD Construction Index", url: "https://www.louisianaeconomicdevelopment.com" },
  { slug: "ldeq-edms", name: "LDEQ EDMS", url: "https://edms.deq.louisiana.gov" },
  { slug: "usace-mvn", name: "USACE MVN", url: "https://www.mvn.usace.army.mil" },
  { slug: "lpsc", name: "Louisiana PSC eFiling", url: "https://lpscefiling.lpsc.la.gov" },
  { slug: "la-sos", name: "Louisiana SOS", url: "https://coraweb.sos.la.gov/commercialsearch/" },
  { slug: "ascension-assessor", name: "Ascension Parish Assessor", url: "https://www.ascensionparishla.gov" },
  { slug: "ebr-gis", name: "East Baton Rouge GIS", url: "https://gis.brla.gov" },
  { slug: "calcasieu-assessor", name: "Calcasieu Parish Assessor", url: "https://www.calcasieuassessor.com" },
  { slug: "sec-edgar", name: "SEC EDGAR", url: "https://efts.sec.gov" },
  { slug: "sam-gov", name: "SAM.gov", url: "https://api.sam.gov" },
  { slug: "emma-msrb", name: "EMMA (MSRB)", url: "https://emma.msrb.org" },
  { slug: "tceq", name: "TCEQ", url: "https://www15.tceq.texas.gov" },
];

const RESEARCH_BASE =
  "https://github.com/blakegallagher1/gulf-coast-industrial-radar/blob/main/packages/adapters/src/research";

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Data Sources</h1>
      <p className="mb-6 text-sm text-gray-500">
        {SOURCES.length} active sources · schema research artifacts available for each
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Schema Research
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {SOURCES.map((src) => (
              <tr key={src.slug} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{src.name}</td>
                <td className="px-4 py-3 text-sm">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {new URL(src.url).hostname}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`${RESEARCH_BASE}/${src.slug}.md`}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    View artifact
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
