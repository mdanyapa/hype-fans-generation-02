import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Sparkles, UsersRound } from 'lucide-react'

const venueNames = ['The Court Tavern', 'Downtown Game Room', 'Stadium Social']

export default async function GameDiscoveryPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const title = gameId === 'argentina-brazil' ? 'Argentina at Brazil' : gameId === 'cowboys-eagles' ? 'Cowboys at Eagles' : 'Warriors at Lakers'
  return <main className="min-h-screen bg-[#07060b] text-white"><div className="mx-auto min-h-screen max-w-md border-x border-white/5 bg-[radial-gradient(circle_at_top,#25113f_0%,#0c0813_38%,#07060b_70%)] px-5 py-6">
    <Link href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"><ArrowLeft className="h-5 w-5" /></Link>
    <p className="mt-8 text-[10px] font-black uppercase tracking-[0.22em] text-[#b78cff]">Choose your experience</p>
    <h1 className="mt-2 text-3xl font-black">{title}</h1>
    <p className="mt-2 text-sm text-[#9d91aa]">Watch with fans at a local venue, or upgrade to a live-game suite experience.</p>

    <div className="mt-6 grid grid-cols-2 gap-3">
      <div className="rounded-3xl border border-[#8d5cff]/60 bg-[#7c3aed]/15 p-4">
        <UsersRound className="h-6 w-6 text-[#c9a8ff]" /><p className="mt-3 text-sm font-black">Watch at a Venue</p><p className="mt-1 text-[11px] leading-4 text-[#a99db5]">Restaurants, sports bars, hotels and Hype Zones.</p><span className="mt-3 inline-block rounded-full bg-[#7c3aed] px-2.5 py-1 text-[9px] font-black">PRIMARY</span>
      </div>
      <Link href={`/discover/${gameId}/suites`} className="rounded-3xl border border-[#f6c945]/30 bg-[#f6c945]/5 p-4">
        <Sparkles className="h-6 w-6 text-[#f6c945]" /><p className="mt-3 text-sm font-black">Suites & VIP</p><p className="mt-1 text-[11px] leading-4 text-[#a99db5]">Go to the live game in a premium suite.</p><span className="mt-3 inline-block text-[10px] font-black text-[#f6c945]">EXPLORE SUITES →</span>
      </Link>
    </div>

    <div className="mt-8 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7da5]">Watch nearby</p><h2 className="mt-1 text-xl font-black">Places showing this game</h2></div><button className="text-xs font-bold text-[#b78cff]">Map</button></div>
    <div className="mt-4 space-y-3">{venueNames.map((venue,index)=><div key={venue} className="rounded-3xl border border-white/10 bg-white/[0.055] p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{venue}</h2><p className="mt-1 text-xs text-[#9b8fa7]"><MapPin className="mr-1 inline h-3.5 w-3.5" />{index+1}.2 miles · {index === 0 ? 'Sports Bar' : 'Hype Zone'}</p></div><span className="rounded-full bg-[#f6c945]/10 px-2.5 py-1 text-[10px] font-black text-[#f6c945]">{18-index*3} spots</span></div><div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-xs font-bold text-[#b8adbf]"><UsersRound className="mr-1 inline h-3.5 w-3.5 text-[#b78cff]" />{64+index*21} fans going</span><Link href={`/discover/${gameId}/venue/${index+1}`} className="rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-black">Reserve Your Spot</Link></div></div>)}</div>
  </div></main>
}
