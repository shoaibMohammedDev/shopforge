import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing review data...')

  // Step 1: Delete all existing reviews
  const deleteResult = await prisma.review.deleteMany({})
  console.log(`✅ Deleted ${deleteResult.count} existing reviews`)

  // Step 2: Get all customers (non-admin users)
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
  })
  console.log(`📋 Found ${customers.length} customers`)

  if (customers.length === 0) {
    console.log('❌ No customers found. Cannot create reviews.')
    return
  }

  // Step 3: Define correct review data for each product slug
  const reviewDefinitions = [
    {
      slug: 'iphone-16-pro-max',
      reviews: [
        {
          rating: 5,
          title: 'Best iPhone yet!',
          content: 'The iPhone 16 Pro Max is absolutely incredible. The camera system is outstanding, especially in low light. Battery life lasts me through a full day of heavy use. The titanium frame feels premium and the display is gorgeous.',
        },
        {
          rating: 4,
          title: 'Great phone but pricey',
          content: 'Upgraded from the 14 Pro Max and the improvements are noticeable. The new camera button is handy and action mode for video is amazing. Only downside is the steep price tag, but you get what you pay for.',
        },
      ],
    },
    {
      slug: 'samsung-galaxy-s24-ultra',
      reviews: [
        {
          rating: 5,
          title: 'The S Pen makes it perfect',
          content: 'Samsung nailed it with the Galaxy S24 Ultra. The S Pen integration is fantastic for productivity, and the 200MP camera takes stunning photos. Galaxy AI features like live translation are genuinely useful. Best Android phone I have ever owned.',
        },
      ],
    },
    {
      slug: 'macbook-pro-16-m4-max',
      reviews: [
        {
          rating: 5,
          title: 'A powerhouse for creative work',
          content: 'The MacBook Pro 16 with M4 Max is a beast. Rendering 4K video in Final Cut Pro is blazing fast, and the battery life is still incredible even under heavy workloads. The Liquid Retina XDR display is the best screen I have ever seen on a laptop.',
        },
      ],
    },
    {
      slug: 'sony-wh-1000xm5',
      reviews: [
        {
          rating: 4,
          title: 'Best noise cancelling headphones',
          content: 'The Sony WH-1000XM5 has phenomenal noise cancellation that blocks out everything. Sound quality is rich and detailed. They are incredibly comfortable for long listening sessions. The only reason for 4 stars instead of 5 is the higher price compared to the XM4.',
        },
      ],
    },
    {
      slug: 'ipad-pro-13-m4',
      reviews: [
        {
          rating: 5,
          title: 'Replaced my laptop',
          content: 'The iPad Pro 13 with the M4 chip is so powerful that it has replaced my laptop for most tasks. The tandem OLED display is stunning with perfect blacks. Using it with the Apple Pencil Pro for illustration is a dream. This is the future of computing.',
        },
      ],
    },
    {
      slug: 'nike-air-max-90',
      reviews: [
        {
          rating: 4,
          title: 'Classic style that never gets old',
          content: 'The Nike Air Max 90 is a timeless classic. The visible Air unit provides great cushioning and the leather and mesh upper is both durable and breathable. They go with everything from jeans to joggers. Only wish they came in more wide sizes.',
        },
      ],
    },
    {
      slug: 'dell-xps-15',
      reviews: [
        {
          rating: 4,
          title: 'Excellent Windows laptop',
          content: 'The Dell XPS 15 is a fantastic Windows laptop. The InfinityEdge display is gorgeous and the build quality rivals MacBook. Performance is snappy with the Intel processor handling everything I throw at it. The only issue is fan noise under heavy load.',
        },
      ],
    },
    {
      slug: 'bose-quietcomfort-ultra',
      reviews: [
        {
          rating: 5,
          title: 'Premium comfort and sound',
          content: 'The Bose QuietComfort Ultra headphones are the most comfortable headphones I have ever worn. The spatial audio feature adds an immersive dimension to music and movies. Noise cancellation is on par with the best in the market. Worth every penny for frequent travelers.',
        },
      ],
    },
    {
      slug: 'kitchenaid-artisan-stand-mixer',
      reviews: [
        {
          rating: 5,
          title: 'A kitchen essential',
          content: 'The KitchenAid Artisan Stand Mixer is a game changer for anyone who loves baking. It kneads dough effortlessly, whips cream to perfection, and the attachment ecosystem is incredible. I have made pasta, ice cream, and even ground meat with the attachments. Built to last a lifetime.',
        },
      ],
    },
    {
      slug: 'adidas-ultraboost-24',
      reviews: [
        {
          rating: 4,
          title: 'Like running on clouds',
          content: 'The Adidas Ultraboost 24 provides the most comfortable running experience. The Boost midsole returns energy with every step and the Primeknit upper wraps your foot like a sock. Great for both long runs and casual wear. The Continental rubber outsole grips well in wet conditions.',
        },
      ],
    },
    {
      slug: 'samsung-galaxy-tab-s9-ultra',
      reviews: [
        {
          rating: 4,
          title: 'The biggest and best Android tablet',
          content: 'The Samsung Galaxy Tab S9 Ultra with its massive 14.6-inch AMOLED screen is perfect for media consumption and productivity. The S Pen is responsive and included in the box. DeX mode turns it into a desktop-like experience. The size is not for everyone but if you want a big tablet, this is it.',
        },
      ],
    },
    {
      slug: 'sony-playstation-5-slim',
      reviews: [
        {
          rating: 5,
          title: 'Next gen gaming at its best',
          content: 'The PS5 Slim is a fantastic console. Loading times are virtually non-existent thanks to the SSD, and the DualSense controller haptic feedback is revolutionary. The slimmer design fits much better in my entertainment center. Game library keeps getting better with exclusives like Spider-Man 2 and God of War Ragnarok.',
        },
      ],
    },
  ]

  // Step 4: Create reviews for each product
  let totalCreated = 0
  for (const def of reviewDefinitions) {
    const product = await prisma.product.findUnique({
      where: { slug: def.slug },
    })

    if (!product) {
      console.log(`⚠️  Product not found: ${def.slug}`)
      continue
    }

    for (let i = 0; i < def.reviews.length; i++) {
      const reviewData = def.reviews[i]
      const customer = customers[i % customers.length]

      await prisma.review.create({
        data: {
          userId: customer.id,
          productId: product.id,
          rating: reviewData.rating,
          title: reviewData.title,
          content: reviewData.content,
          isVerified: true,
          isApproved: true,
          helpfulYes: Math.floor(Math.random() * 15) + 1,
          helpfulNo: Math.floor(Math.random() * 3),
        },
      })
      totalCreated++
    }
    console.log(`✅ Created ${def.reviews.length} review(s) for ${def.slug}`)
  }

  console.log(`\n📊 Total reviews created: ${totalCreated}`)

  // Step 5: Recalculate avgRating and reviewCount for each product
  const products = await prisma.product.findMany()
  for (const product of products) {
    const reviews = await prisma.review.findMany({
      where: { productId: product.id },
    })

    const reviewCount = reviews.length
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0

    await prisma.product.update({
      where: { id: product.id },
      data: {
        reviewCount,
        avgRating: Math.round(avgRating * 10) / 10,
      },
    })
  }

  console.log('✅ Recalculated avgRating and reviewCount for all products')
  console.log('🎉 Review data fix complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error fixing reviews:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
