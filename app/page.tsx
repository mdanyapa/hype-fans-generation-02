'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Gift, Home, MapPin, Search, Trophy, UserRound, UsersRound } from 'lucide-react'

const games = [
  { id: 'lakers-warriors', league: 'NBA', date: 'Tonight · 7:30 PM', away: 'Warriors', home: 'Lakers', fans: 284, venues: 12, accent: '🏀' },
  { id: 'argentina-brazil', league: 'Soccer', date: 'Sat · 5:00 PM', away: 'Argentina', home: 'Brazil', fans: 419, venues: 8, accent: '⚽' },
  { id: 'cowboys-eagles', league: 'NFL', date: 'Sun · 1:25 PM', away: 'Cowboys', home: 'Eagles', fans: 176, venues: 15, accent: '🏈' },
]

const nav = [
  { label: 'Discover', icon: Home },
  { label: 'Community', icon: UsersRound },
  { label: 'Rewards', icon: Gift },
  { label: 'Me', icon: UserRound },
]

export default function DiscoverPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Near Me')
  const [activeNav, setActiveNav] = useState('Discover')
  const [joined, setJoined] = useState<string[]>([])

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return games
    return games.filter((game) => `${game.league} ${game.away} ${game.home}`.toLowerCase().includes(q))
  }, [query])

  function toggleImIn(id: string) {
    setJoined((current) => current.includes(id) ? current.filter((gameId) => gameId !== id) : [...current, id])
  }

  return (
    <main className="min-h-screen bg-[#07060b] text-white pb-24 selection:bg-purple-500/40">
      <div className="mx-auto min-h-screen w-full max-w-md border-x border-white/5 bg-[radial-gradient(circle_at_top,#25113f_0%,#0c0813_32%,#07060b_65%)] shadow-2xl">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#09070e]/90 px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">♛</span>
                <h1 className="text-[22px] font-black tracking-[0.16em]">HYPE FANS</h1>
              </div>
              <p className="mt-0.5 text-[9px] font-bold tracking-[0.23em] text-[#f6c945]">GAMES BRING US TOGETHER.</p>
            </div>
            <button aria-label="Profile" className="grid h-10 w-10 place-items-center rounded-full border border-[#8d5cff]/60 bg-purple-500/10">
              <UserRound className="h-5 w-5 text-[#d9c9ff]" />
            </button>
          </div>
        </header>

        <section className="px-5 pb-3 pt-7">
          <p className="text-sm font-semibold text-[#b6a8ca]">Your game. Your crowd. Your place.</p>
          <h2 className="mt-2 text-[34px] font-black leading-[1.03] tracking-tight">
            Find Your Game.<br />
            <span className="text-[#b38aff]">Find Your Fans.</span><br />
            <span className="text-[#f6c945]">Reserve Your Place.</span>
          </h2>

          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9e8fb3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Team, game, sport or event"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.07] pl-12 pr-4 text-sm font-semibold outline-none transition placeholder:text-[#80758f] focus:border-[#9a65ff]/70 focus:bg-white/[0.09]"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {['Near Me', 'Tonight', 'This Weekend'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${filter === item ? 'border-[#a46fff] bg-[#7c3aed] text-white' : 'border-white/10 bg-white/[0.04] text-[#b9aec6]'}`}
              >
                {item === 'Near Me' && <MapPin className="mr-1 inline h-3.5 w-3.5" />}{item}
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f7da5]">Popular now</p>
              <h3 className="mt-1 text-xl font-black">Games fans are joining</h3>
            </div>
            <button className="text-xs font-bold text-[#b78cff]">See all</button>
          </div>

          <div className="space-y-3">
            {filteredGames.map((game) => {
              const isJoined = joined.includes(game.id)
              return (
                <article key={game.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] shadow-[0_18px_50px_rgba(0,0,0,.25)]">
                  <button onClick={() => router.push(`/discover/${game.id}`)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-full bg-[#2b183d] px-2.5 py-1 font-black text-[#c9a8ff]">{game.league}</span>
                      <span className="font-bold text-[#a89bb7]">{game.date}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black">{game.away}</p>
                        <p className="text-xs font-semibold text-[#7f738c]">at</p>
                        <p className="text-lg font-black">{game.home}</p>
                      </div>
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#4b2580] to-[#24112f] text-3xl shadow-inner">{game.accent}</div>
                    </div>
                    <div className="mt-4 flex gap-4 border-t border-white/5 pt-3 text-xs font-semibold text-[#aaa0b5]">
                      <span><UsersRound className="mr-1 inline h-3.5 w-3.5 text-[#b78cff]" />{game.fans} fans</span>
                      <span><MapPin className="mr-1 inline h-3.5 w-3.5 text-[#f6c945]" />{game.venues} places</span>
                    </div>
                  </button>
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <button onClick={() => toggleImIn(game.id)} className={`rounded-xl py-2.5 text-xs font-black transition ${isJoined ? 'bg-[#f6c945] text-[#17100a]' : 'bg-[#7c3aed] text-white'}`}>{isJoined ? '✓ I’M IN' : 'I’M IN'}</button>
                    <button onClick={() => router.push(`/discover/${game.id}`)} className="rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs font-black">Find a Place</button>
                  </div>
                </article>
              )
            })}
            {filteredGames.length === 0 && <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-[#8f849a]">No games match that search yet.</div>}
          </div>
        </section>

        <section className="mx-5 mt-6 rounded-3xl border border-[#5f3b91]/40 bg-gradient-to-br from-[#25113a] to-[#100a18] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f6c945]/10"><Trophy className="h-5 w-5 text-[#f6c945]" /></div>
            <div>
              <p className="text-sm font-black">Your fan life starts here.</p>
              <p className="mt-1 text-xs leading-5 text-[#9f92ad]">Join games, meet your crowd, earn Hype Points and unlock real fan experiences.</p>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-40 grid h-[74px] w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-white/10 bg-[#0a080f]/95 px-2 pb-2 pt-2 backdrop-blur-xl">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => setActiveNav(label)} className={`flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${activeNav === label ? 'text-[#c49cff]' : 'text-[#746a80]'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  )
}
