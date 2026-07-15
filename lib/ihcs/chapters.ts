/**
 * IHCS manual chapter definitions — mirrors templates/ihcs/manual-template.html
 * (the approved template; chapter set and order must not change).
 */
export interface ChapterDef {
  number: number
  titleBM: string
  titleEN: string
  /** What MPPHM 2020 expects this chapter to cover */
  mustCover: string[]
  /** Evidence categories whose facts feed this chapter */
  evidenceCategories: string[]
  relatedRubricIds: string[]
}

export const CHAPTERS: ChapterDef[] = [
  {
    number: 1,
    titleBM: 'POLISI HALAL',
    titleEN: 'Halal Policy',
    mustCover: [
      "management's commitment to halal compliance",
      'scope of the policy (premises, products, services)',
      'communication of the policy to staff',
    ],
    evidenceCategories: ['halal_policy', 'business_profile'],
    relatedRubricIds: ['6.1-halal-policy'],
  },
  {
    number: 2,
    titleBM: 'KAWALAN BAHAN MENTAH',
    titleEN: 'Raw Material Control',
    mustCover: [
      'how raw materials are selected and approved',
      'requirement for supplier halal certificates on critical items',
      'handling of doubtful (mushbooh) materials',
    ],
    evidenceCategories: ['ingredient_list', 'supplier_certificate', 'menu_list'],
    relatedRubricIds: ['4.2-ingredient-list', '4.3-supplier-certs'],
  },
  {
    number: 3,
    titleBM: 'REKOD PEMBELIAN',
    titleEN: 'Purchase Records',
    mustCover: [
      'how purchases are recorded and retained',
      'traceability from purchase to supplier certificate',
      'verification of halal status at receiving',
    ],
    evidenceCategories: ['ingredient_list', 'supplier_certificate'],
    relatedRubricIds: ['4.2-ingredient-list', '4.3-supplier-certs'],
  },
  {
    number: 4,
    titleBM: 'PROSEDUR PEMBERSIHAN',
    titleEN: 'Cleaning Procedures',
    mustCover: [
      'cleaning and sanitation schedule for premises and equipment',
      'sertu/samak procedure when contamination occurs',
      'pest control arrangements',
    ],
    evidenceCategories: ['pest_control', 'kitchen_photo', 'flow_chart'],
    relatedRubricIds: ['7.1-pest-control', '7.3-premise-hygiene', '5.2-flow-chart'],
  },
  {
    number: 5,
    titleBM: 'TANGGUNGJAWAB HALAL',
    titleEN: 'Halal Responsibility',
    mustCover: [
      'who is responsible for halal matters (halal executive/committee)',
      'their duties and authority',
      'internal review arrangements',
    ],
    evidenceCategories: ['business_profile', 'training_certificate'],
    relatedRubricIds: ['6.3-training'],
  },
  {
    number: 6,
    titleBM: 'REKOD LATIHAN',
    titleEN: 'Training Records',
    mustCover: [
      'halal awareness training plan for staff',
      'records of completed training',
      'refresher/renewal schedule',
    ],
    evidenceCategories: ['training_certificate'],
    relatedRubricIds: ['6.3-training'],
  },
  {
    number: 7,
    titleBM: 'KEBOLEHKESANAN',
    titleEN: 'Traceability',
    mustCover: [
      'tracing products back to raw materials and suppliers',
      'production flow from receiving to serving',
      'recall/withdrawal steps when a halal issue is found',
    ],
    evidenceCategories: ['flow_chart', 'ingredient_list', 'menu_list'],
    relatedRubricIds: ['5.2-flow-chart'],
  },
]
