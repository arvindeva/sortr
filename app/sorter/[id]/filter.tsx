'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

const touhouCharactersFilter = [
  {
    title: 'Embodiment of Scarlet Devil',
    list: [
      {
        name: 'Rumia',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Daiyousei',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Cirno',
        image: '/images/sakuya.jpg',
      },
    ],
  },
  {
    title: 'Perfect Cherry Blossom',
    list: [
      {
        name: 'Letty Whiterock',
        image: '/images/sakuya.jpg',
      },

      {
        name: 'Chen',
        image: '/images/sakuya.jpg',
      },

      {
        name: 'Alice Margatroid',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Lunasa Prismriver',
        image: '/images/sakuya.jpg',
      },
    ],
  },
  {
    title: 'Immaterial and Missing Power',
    list: [
      {
        name: 'Suika Ibuki',
        image: '/images/sakuya.jpg',
      },
    ],
  },
  {
    title: 'Imperishable Night',
    list: [
      {
        name: 'Wriggle Nightbug',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Mystia Lorelei',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Keine',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Tewi Inaba',
        image: '/images/sakuya.jpg',
      },
      {
        name: 'Eirin',
        image: '/images/sakuya.jpg',
      },
    ],
  },
]

interface Item {
  name: string
  image: string
}

interface IFilterCard {
  filter: {
    title: string
    list: Item[]
  }
}

function FilterCard({ filter }: IFilterCard) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          <div className="flex flex-row gap-2 items-center">
            <Checkbox />
            {filter.title}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="indent-6">
          {filter.list.map((item, i) => {
            return <li key={i}>{item.name}</li>
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
export default function Filter() {
  return (
    <section>
      <h2 className="text-3xl font-semibold mb-4">Filters</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {touhouCharactersFilter.map((filter, i) => {
          return <FilterCard key={i} filter={filter} />
        })}
      </div>
    </section>
  )
}
