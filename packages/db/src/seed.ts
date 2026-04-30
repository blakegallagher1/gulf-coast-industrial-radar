/**
 * Seed script: inserts 11 backtest projects with realistic Gulf Coast industrial data.
 * Run with: pnpm db:seed
 */
import { prisma, ProjectStatus, SignalType } from './index'

async function main() {
  console.log('Seeding database...')

  // Clear existing data in safe order
  await prisma.watchlistProject.deleteMany()
  await prisma.watchlist.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.projectEntity.deleteMany()
  await prisma.entity.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.brief.deleteMany()
  await prisma.projectSignal.deleteMany()
  await prisma.signal.deleteMany()
  await prisma.project.deleteMany()
  await prisma.dataSource.deleteMany()

  // Seed data sources
  const sources = await Promise.all([
    prisma.dataSource.create({
      data: { slug: 'led-fastlane', name: 'LED FastLane', url: 'https://fastlane.led.state.la.us' },
    }),
    prisma.dataSource.create({
      data: { slug: 'ldeq-edms', name: 'LDEQ EDMS', url: 'https://edms.deq.louisiana.gov' },
    }),
    prisma.dataSource.create({
      data: {
        slug: 'usace-mvn',
        name: 'USACE MVN Permits',
        url: 'https://www.mvn.usace.army.mil/Missions/Regulatory/Permits/',
      },
    }),
  ])

  // 11 backtest projects
  const projectsData = [
    {
      name: 'St. James Parish Carbon Capture Hub',
      slug: 'st-james-carbon-capture',
      description: 'Large-scale carbon capture and sequestration complex along the Mississippi River',
      status: ProjectStatus.CONFIRMED,
      parish: 'St. James',
      state: 'LA',
      industry: 'Energy',
      naicsCode: '211120',
      estimatedInvestmentUsd: BigInt(4_500_000_000),
      estimatedJobs: 2500,
      formationScore: 0.91,
      siteFitScore: 0.88,
      quietAssemblyScore: 0.75,
      compositeScore: 0.87,
    },
    {
      name: 'Calcasieu Pass LNG Expansion',
      slug: 'calcasieu-pass-lng-expansion',
      description: 'Phase 2 expansion of existing LNG export terminal',
      status: ProjectStatus.ACTIVE,
      parish: 'Cameron',
      state: 'LA',
      industry: 'LNG Export',
      naicsCode: '493190',
      estimatedInvestmentUsd: BigInt(7_200_000_000),
      estimatedJobs: 1200,
      formationScore: 0.94,
      siteFitScore: 0.96,
      quietAssemblyScore: 0.82,
      compositeScore: 0.93,
    },
    {
      name: 'Port of Lake Charles Ammonia Terminal',
      slug: 'lake-charles-ammonia-terminal',
      description: 'Green ammonia export terminal with offshore wind integration',
      status: ProjectStatus.WATCHING,
      parish: 'Calcasieu',
      state: 'LA',
      industry: 'Petrochemical',
      naicsCode: '325180',
      estimatedInvestmentUsd: BigInt(1_800_000_000),
      estimatedJobs: 450,
      formationScore: 0.72,
      siteFitScore: 0.81,
      quietAssemblyScore: 0.61,
      compositeScore: 0.73,
    },
    {
      name: 'Ascension Parish Hydrogen Complex',
      slug: 'ascension-hydrogen-complex',
      description: 'Blue hydrogen production facility with pipeline interconnect',
      status: ProjectStatus.ACTIVE,
      parish: 'Ascension',
      state: 'LA',
      industry: 'Hydrogen',
      naicsCode: '325120',
      estimatedInvestmentUsd: BigInt(2_100_000_000),
      estimatedJobs: 350,
      formationScore: 0.85,
      siteFitScore: 0.79,
      quietAssemblyScore: 0.88,
      compositeScore: 0.84,
    },
    {
      name: 'East Baton Rouge Polymer Plant',
      slug: 'ebr-polymer-plant',
      description: 'High-density polyethylene manufacturing expansion',
      status: ProjectStatus.CONFIRMED,
      parish: 'East Baton Rouge',
      state: 'LA',
      industry: 'Plastics',
      naicsCode: '326100',
      estimatedInvestmentUsd: BigInt(890_000_000),
      estimatedJobs: 280,
      formationScore: 0.88,
      siteFitScore: 0.84,
      quietAssemblyScore: 0.71,
      compositeScore: 0.83,
    },
    {
      name: 'Plaquemines LNG Terminal',
      slug: 'plaquemines-lng-terminal',
      description: 'Greenfield LNG export facility near Venice, Louisiana',
      status: ProjectStatus.ACTIVE,
      parish: 'Plaquemines',
      state: 'LA',
      industry: 'LNG Export',
      naicsCode: '493190',
      estimatedInvestmentUsd: BigInt(18_500_000_000),
      estimatedJobs: 5000,
      formationScore: 0.97,
      siteFitScore: 0.93,
      quietAssemblyScore: 0.89,
      compositeScore: 0.95,
    },
    {
      name: 'Iberville Parish Data Center Campus',
      slug: 'iberville-data-center',
      description: 'Hyperscale data center cluster leveraging Mississippi River cooling',
      status: ProjectStatus.WATCHING,
      parish: 'Iberville',
      state: 'LA',
      industry: 'Technology',
      naicsCode: '518210',
      estimatedInvestmentUsd: BigInt(3_200_000_000),
      estimatedJobs: 800,
      formationScore: 0.68,
      siteFitScore: 0.74,
      quietAssemblyScore: 0.91,
      compositeScore: 0.76,
    },
    {
      name: 'Sulphur Chlor-Alkali Modernization',
      slug: 'sulphur-chlor-alkali',
      description: 'Membrane cell technology upgrade at existing chlor-alkali plant',
      status: ProjectStatus.CONFIRMED,
      parish: 'Calcasieu',
      state: 'LA',
      industry: 'Chemicals',
      naicsCode: '325180',
      estimatedInvestmentUsd: BigInt(420_000_000),
      estimatedJobs: 120,
      formationScore: 0.82,
      siteFitScore: 0.91,
      quietAssemblyScore: 0.64,
      compositeScore: 0.81,
    },
    {
      name: 'Port Allen Steel Mini-Mill',
      slug: 'port-allen-steel-minimill',
      description: 'Electric arc furnace steel production using recycled scrap',
      status: ProjectStatus.WATCHING,
      parish: 'West Baton Rouge',
      state: 'LA',
      industry: 'Steel',
      naicsCode: '331110',
      estimatedInvestmentUsd: BigInt(1_100_000_000),
      estimatedJobs: 600,
      formationScore: 0.71,
      siteFitScore: 0.77,
      quietAssemblyScore: 0.69,
      compositeScore: 0.72,
    },
    {
      name: 'Geismar Ethylene Cracker Expansion',
      slug: 'geismar-ethylene-cracker',
      description: 'World-scale ethylene cracker capacity addition at existing complex',
      status: ProjectStatus.ACTIVE,
      parish: 'Ascension',
      state: 'LA',
      industry: 'Petrochemical',
      naicsCode: '325110',
      estimatedInvestmentUsd: BigInt(5_600_000_000),
      estimatedJobs: 1800,
      formationScore: 0.93,
      siteFitScore: 0.95,
      quietAssemblyScore: 0.78,
      compositeScore: 0.91,
    },
    {
      name: 'Bogalusa Bioenergy Conversion',
      slug: 'bogalusa-bioenergy',
      description: 'Former paper mill converted to advanced biofuels production',
      status: ProjectStatus.WATCHING,
      parish: 'Washington',
      state: 'LA',
      industry: 'Bioenergy',
      naicsCode: '325193',
      estimatedInvestmentUsd: BigInt(650_000_000),
      estimatedJobs: 220,
      formationScore: 0.64,
      siteFitScore: 0.69,
      quietAssemblyScore: 0.57,
      compositeScore: 0.64,
    },
  ]

  for (const projectData of projectsData) {
    await prisma.project.create({ data: projectData })
  }

  // Seed sample signals
  const signal1 = await prisma.signal.create({
    data: {
      type: SignalType.PERMIT,
      title: 'Air Quality Permit Application - Calcasieu Pass LNG Train 3',
      summary: 'Title V air quality permit application for LNG Train 3 construction',
      state: 'LA',
      parish: 'Cameron',
      industry: 'LNG Export',
      investmentUsd: BigInt(2_400_000_000),
      confidence: 0.94,
      signalDate: new Date('2024-11-15'),
      metadata: { source: 'LDEQ EDMS', permitNumber: 'TV-0001-23' },
    },
  })

  const signal2 = await prisma.signal.create({
    data: {
      type: SignalType.FILING,
      title: 'LED FastLane Project Approval - Ascension Hydrogen',
      summary: 'Board of Commerce and Industry approval for advanced manufacturing incentives',
      state: 'LA',
      parish: 'Ascension',
      industry: 'Hydrogen',
      investmentUsd: BigInt(2_100_000_000),
      jobsCreated: 350,
      confidence: 0.98,
      signalDate: new Date('2024-12-03'),
      metadata: { source: 'LED FastLane', projectNumber: 'ADV-2024-0847' },
    },
  })

  console.log(`Seeded ${projectsData.length} projects and 2 signals`)
  console.log('Signal IDs:', signal1.id, signal2.id)
  console.log('Source IDs:', sources.map((s) => s.id))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
