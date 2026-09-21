import Link from 'next/link'
import { ArrowLeft, Check, MapPin, UsersRound } from 'lucide-react'

const inventory = [
  { name: 'Hype Seat', detail: 'Guaranteed seat in the Hype viewing area', left: 14 },
  { name: 'Table Spot', detail: 'Reserved place at a shared fan table', left: 8 },
  { name: 'Bar Seat', detail: 'Guaranteed bar seating with game view', left: 6 },
  { name: 'Hype Zone', detail: 'Dedicated team-fan section', left: 12 },
]
export default async function VenueReservationPage({ params }: { params: Promise<{ gameId:string, venueId:string }> }) {
 const { gameId } = await params
 return <main className="min-h-screen bg-[#07060b] text-white"><div className="mx-auto min-h-screen max-w-md border-x border-white/5 px-5 py-6">
  <Link href={`/discover/${gameId}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"><ArrowLeft className="h-5 w-5" /></Link>
  <p className="mt-7 text-[10px] font-black uppercase tracking-[.2em] text-[#b78cff]">Watch venue</p><h1 className="mt-2 text-3xl font-black">The Court Tavern</h1><p className="mt-2 text-xs text-[#a79bad]"><MapPin className="mr-1 inline h-3.5 w-3.5"/>0.8 miles · Sound ON · Food & Drinks</p>
  <div className="mt-5 rounded-3xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 p-4"><p className="text-sm font-black">Warriors at Lakers · Tonight 7:30 PM</p><p className="mt-1 text-xs text-[#b7a9c5]"><UsersRound className="mr-1 inline h-3.5 w-3.5"/>82 Hype fans going</p></div>
  <h2 className="mt-7 text-xl font-black">Reserve your spot</h2><p className="mt-1 text-xs text-[#91859d]">Choose from this venue's available Hype inventory.</p>
  <div className="mt-4 space-y-3">{inventory.map((item,i)=><button key={item.name} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.055] p-4 text-left focus:border-[#9a65ff]"><div><p className="font-black">{item.name}</p><p className="mt-1 text-[11px] text-[#91859d]">{item.detail}</p></div><div className="text-right"><p className="text-xs font-black text-[#f6c945]">{item.left} left</p>{i===0&&<Check className="ml-auto mt-2 h-4 w-4 text-[#b78cff]"/>}</div></button>)}</div>
  <button className="mt-6 w-full rounded-2xl bg-[#7c3aed] py-4 text-sm font-black">Continue Reservation</button>
  <p className="mt-4 text-center text-[11px] text-[#776d80]">This is a venue reservation — no arena seating chart is used.</p>
 </div></main>
}
