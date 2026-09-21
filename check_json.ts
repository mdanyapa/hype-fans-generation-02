
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const suites = await prisma.suite.findMany()
  for (const suite of suites) {
    try {
      JSON.parse(suite.features)
      console.log(`Suite ${suite.name}: features are valid JSON`)
    } catch (e) {
      console.error(`Suite ${suite.name}: features are INVALID JSON: ${suite.features}`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
