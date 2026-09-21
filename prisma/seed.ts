import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default admin user
  const adminPasswordHash = await bcrypt.hash('admin', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hypefanz.vip' },
    update: {},
    create: {
      email: 'admin@hypefanz.vip',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create sample events with suites and seats
  const events = [
    {
      name: 'ELECTRIC NIGHTS FESTIVAL',
      date: new Date('2025-01-15T20:00:00'),
      venue: 'Crypto.com Arena',
      description: 'An electrifying night of music and entertainment featuring top DJs and performers.',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      suites: [
        {
          name: 'VIP SUITE A',
          description: 'Premium suite with the best views',
          features: JSON.stringify(['Best View', 'Private Bar', 'Dedicated Server', 'VIP Parking']),
          suiteCost: 400,
          seatCount: 8,
          seatPrice: 550,
          audienceType: 'HOME',
        },
        {
          name: 'VIP SUITE B',
          description: 'Excellent suite with great amenities',
          features: JSON.stringify(['Great View', 'Complimentary Drinks', 'VIP Entrance']),
          suiteCost: 300,
          seatCount: 10,
          seatPrice: 425,
          audienceType: 'VISITOR',
        },
        {
          name: 'VIP SUITE C',
          description: 'Comfortable suite for groups',
          features: JSON.stringify(['Good View', 'Snacks Included', 'VIP Access']),
          suiteCost: 250,
          seatCount: 12,
          seatPrice: 350,
          audienceType: 'HOME',
        },
      ],
    },
    {
      name: 'HIP HOP AWARDS NIGHT',
      date: new Date('2025-01-31T19:00:00'),
      venue: 'Crypto.com Arena',
      description: 'Celebrate the best in hip hop with live performances and award presentations.',
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      suites: [
        {
          name: 'VIP SUITE A',
          description: 'Premium suite with the best views',
          features: JSON.stringify(['Front Row View', 'Meet & Greet Access', 'Private Bar', 'Gourmet Catering']),
          suiteCost: 600,
          seatCount: 8,
          seatPrice: 850,
          audienceType: 'HOME',
        },
        {
          name: 'VIP SUITE B',
          description: 'Excellent suite with great amenities',
          features: JSON.stringify(['Excellent View', 'Premium Bar', 'VIP Entrance']),
          suiteCost: 450,
          seatCount: 10,
          seatPrice: 625,
          audienceType: 'VISITOR',
        },
      ],
    },
    {
      name: 'ROCK LEGENDS REUNION',
      date: new Date('2025-02-15T20:00:00'),
      venue: 'Crypto.com Arena',
      description: 'A once-in-a-lifetime reunion of rock legends performing their greatest hits.',
      imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800',
      suites: [
        {
          name: 'VIP SUITE A',
          description: 'Ultimate rock experience',
          features: JSON.stringify(['Stage-Side View', 'Backstage Tour', 'Private Bar', 'Memorabilia']),
          suiteCost: 500,
          seatCount: 8,
          seatPrice: 699,
          audienceType: 'HOME',
        },
        {
          name: 'VIP SUITE B',
          description: 'Premium rock suite',
          features: JSON.stringify(['Great View', 'Rock Merch Pack', 'Premium Bar']),
          suiteCost: 350,
          seatCount: 10,
          seatPrice: 499,
          audienceType: 'VISITOR',
        },
        {
          name: 'VIP SUITE C',
          description: 'Rock fan experience',
          features: JSON.stringify(['Good View', 'Snacks & Drinks', 'VIP Entry']),
          suiteCost: 250,
          seatCount: 12,
          seatPrice: 375,
          audienceType: 'HOME',
        },
      ],
    },
    {
      name: 'NBA ALL-STAR WEEKEND',
      date: new Date('2025-02-22T18:00:00'),
      venue: 'Crypto.com Arena',
      description: 'Watch the biggest stars in basketball compete in the annual All-Star game.',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      suites: [
        {
          name: 'VIP SUITE A',
          description: 'Courtside luxury suite',
          features: JSON.stringify(['Courtside View', 'Player Meet & Greet', 'Gourmet Dining', 'Premium Bar']),
          suiteCost: 800,
          seatCount: 6,
          seatPrice: 1199,
          audienceType: 'HOME',
        },
        {
          name: 'VIP SUITE B',
          description: 'Premium basketball suite',
          features: JSON.stringify(['Excellent Court View', 'All-Star Gear', 'Premium Catering']),
          suiteCost: 600,
          seatCount: 8,
          seatPrice: 899,
          audienceType: 'VISITOR',
        },
      ],
    },
    {
      name: 'COMEDY SPECTACULAR',
      date: new Date('2025-03-08T21:00:00'),
      venue: 'Crypto.com Arena',
      description: 'A night of non-stop laughter with the biggest names in comedy.',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
      suites: [
        {
          name: 'VIP SUITE A',
          description: 'Premium comedy experience',
          features: JSON.stringify(['Best Seats', 'Meet the Comedians', 'Premium Open Bar']),
          suiteCost: 350,
          seatCount: 8,
          seatPrice: 495,
          audienceType: 'HOME',
        },
        {
          name: 'VIP SUITE B',
          description: 'Great comedy suite',
          features: JSON.stringify(['Excellent View', 'Complimentary Drinks', 'VIP Entry']),
          suiteCost: 250,
          seatCount: 10,
          seatPrice: 375,
          audienceType: 'VISITOR',
        },
      ],
    },
  ]

  for (const eventData of events) {
    // Check if event already exists
    const existingEvent = await prisma.event.findFirst({
      where: {
        name: eventData.name,
        date: eventData.date,
      },
    })

    if (existingEvent) {
      console.log(`Event "${eventData.name}" already exists, skipping...`)
      continue
    }

    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        date: eventData.date,
        venue: eventData.venue,
        description: eventData.description,
        imageUrl: eventData.imageUrl,
      },
    })
    console.log(`Created event: ${event.name}`)

    for (const suiteData of eventData.suites) {
      const suite = await prisma.suite.create({
        data: {
          name: suiteData.name,
          description: suiteData.description,
          features: suiteData.features,
          suiteCost: suiteData.suiteCost,
          eventId: event.id,
          audienceType: suiteData.audienceType,
        },
      })
      console.log(`  Created suite: ${suite.name}`)

      // Create seats for the suite
      for (let i = 1; i <= suiteData.seatCount; i++) {
        await prisma.seat.create({
          data: {
            seatNumber: `${suiteData.name.split(' ').pop()}${i}`, // e.g., "A1", "A2", "B1", etc.
            sellingPrice: suiteData.seatPrice,
            status: 'AVAILABLE',
            suiteId: suite.id,
          },
        })
      }
      console.log(`    Created ${suiteData.seatCount} seats`)
    }
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
