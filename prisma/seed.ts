import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Helper to hash passwords simply (in production use bcrypt)
function simpleHash(str: string): string {
  return createHash('sha256').update(str).digest('hex')
}

async function main() {
  console.log('🌱 Seeding database...')

  // ============================================================================
  // CATEGORIES
  // ============================================================================
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics', description: 'Latest gadgets, phones, laptops, and more', sortOrder: 1 }}),
    prisma.category.upsert({ where: { slug: 'clothing' }, update: {}, create: { name: 'Clothing', slug: 'clothing', description: 'Fashion for men, women, and kids', sortOrder: 2 }}),
    prisma.category.upsert({ where: { slug: 'home-kitchen' }, update: {}, create: { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Everything for your home', sortOrder: 3 }}),
    prisma.category.upsert({ where: { slug: 'sports' }, update: {}, create: { name: 'Sports & Outdoors', slug: 'sports', description: 'Gear up for adventure', sortOrder: 4 }}),
    prisma.category.upsert({ where: { slug: 'books' }, update: {}, create: { name: 'Books', slug: 'books', description: 'Best sellers and new releases', sortOrder: 5 }}),
    prisma.category.upsert({ where: { slug: 'beauty' }, update: {}, create: { name: 'Beauty & Personal Care', slug: 'beauty', description: 'Skincare, makeup, and wellness', sortOrder: 6 }}),
    prisma.category.upsert({ where: { slug: 'toys' }, update: {}, create: { name: 'Toys & Games', slug: 'toys', description: 'Fun for all ages', sortOrder: 7 }}),
    prisma.category.upsert({ where: { slug: 'automotive' }, update: {}, create: { name: 'Automotive', slug: 'automotive', description: 'Car accessories and parts', sortOrder: 8 }}),
  ])

  // Sub-categories
  const subCategories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'smartphones' }, update: {}, create: { name: 'Smartphones', slug: 'smartphones', parentId: categories[0].id, sortOrder: 1 }}),
    prisma.category.upsert({ where: { slug: 'laptops' }, update: {}, create: { name: 'Laptops', slug: 'laptops', parentId: categories[0].id, sortOrder: 2 }}),
    prisma.category.upsert({ where: { slug: 'headphones' }, update: {}, create: { name: 'Headphones', slug: 'headphones', parentId: categories[0].id, sortOrder: 3 }}),
    prisma.category.upsert({ where: { slug: 'tablets' }, update: {}, create: { name: 'Tablets', slug: 'tablets', parentId: categories[0].id, sortOrder: 4 }}),
    prisma.category.upsert({ where: { slug: 'mens-clothing' }, update: {}, create: { name: "Men's Clothing", slug: 'mens-clothing', parentId: categories[1].id, sortOrder: 1 }}),
    prisma.category.upsert({ where: { slug: 'womens-clothing' }, update: {}, create: { name: "Women's Clothing", slug: 'womens-clothing', parentId: categories[1].id, sortOrder: 2 }}),
  ])

  // ============================================================================
  // BRANDS
  // ============================================================================
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: 'apple' }, update: {}, create: { name: 'Apple', slug: 'apple', description: 'Think Different' }}),
    prisma.brand.upsert({ where: { slug: 'samsung' }, update: {}, create: { name: 'Samsung', slug: 'samsung', description: 'Galaxy of possibilities' }}),
    prisma.brand.upsert({ where: { slug: 'sony' }, update: {}, create: { name: 'Sony', slug: 'sony', description: 'Be Moved' }}),
    prisma.brand.upsert({ where: { slug: 'nike' }, update: {}, create: { name: 'Nike', slug: 'nike', description: 'Just Do It' }}),
    prisma.brand.upsert({ where: { slug: 'adidas' }, update: {}, create: { name: 'Adidas', slug: 'adidas', description: 'Impossible Is Nothing' }}),
    prisma.brand.upsert({ where: { slug: 'kitchenaid' }, update: {}, create: { name: 'KitchenAid', slug: 'kitchenaid', description: 'For the way it\'s made' }}),
    prisma.brand.upsert({ where: { slug: 'bose' }, update: {}, create: { name: 'Bose', slug: 'bose', description: 'Better sound through research' }}),
    prisma.brand.upsert({ where: { slug: 'dell' }, update: {}, create: { name: 'Dell', slug: 'dell', description: 'The power to do more' }}),
  ])

  // ============================================================================
  // ADMIN USER
  // ============================================================================
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@shopforge.com' },
    update: {},
    create: {
      email: 'admin@shopforge.com',
      name: 'Admin User',
      passwordHash: simpleHash('admin123'),
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  // Customer users
  const customer1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: simpleHash('password123'),
      role: 'CUSTOMER',
      emailVerified: true,
    },
  })

  const customer2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      passwordHash: simpleHash('password123'),
      role: 'CUSTOMER',
      emailVerified: true,
    },
  })

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  const smartphoneCat = subCategories[0]
  const laptopCat = subCategories[1]
  const headphonesCat = subCategories[2]
  const tabletCat = subCategories[3]

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'iPhone 16 Pro Max',
        slug: 'iphone-16-pro-max',
        description: 'The most advanced iPhone ever. Featuring the A18 Pro chip, a 48MP camera system, and a stunning 6.9-inch Super Retina XDR display. Built with Grade 5 titanium and ceramic shield front for incredible durability. Capture spatial photos and videos, and experience all-day battery life.',
        shortDesc: 'A18 Pro chip, 48MP camera, titanium design',
        sku: 'APL-IP16PM-001',
        price: 1199.00,
        comparePrice: 1299.00,
        costPrice: 850.00,
        images: JSON.stringify(['/products/iphone16-1.jpg', '/products/iphone16-2.jpg', '/products/iphone16-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 0.227,
        categoryId: smartphoneCat.id,
        brandId: brands[0].id,
        avgRating: 4.8,
        reviewCount: 234,
        totalSold: 1520,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        description: 'The ultimate Galaxy experience with Galaxy AI. Features a 6.8-inch Dynamic AMOLED display, 200MP camera, and the powerful Snapdragon 8 Gen 3 processor. Includes the iconic built-in S Pen for productivity and creativity.',
        shortDesc: 'Galaxy AI, 200MP camera, S Pen included',
        sku: 'SAM-S24U-001',
        price: 1299.99,
        comparePrice: 1419.99,
        costPrice: 900.00,
        images: JSON.stringify(['/products/s24ultra-1.jpg', '/products/s24ultra-2.jpg', '/products/s24ultra-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 0.232,
        categoryId: smartphoneCat.id,
        brandId: brands[1].id,
        avgRating: 4.6,
        reviewCount: 189,
        totalSold: 980,
      },
    }),
    prisma.product.create({
      data: {
        name: 'MacBook Pro 16" M4 Max',
        slug: 'macbook-pro-16-m4-max',
        description: 'Supercharged by M4 Max. The most powerful MacBook Pro ever with up to 48GB unified memory, 40-core GPU, and up to 22 hours of battery life. Features a stunning 16.2-inch Liquid Retina XDR display with ProMotion technology.',
        shortDesc: 'M4 Max chip, 48GB RAM, 22hr battery',
        sku: 'APL-MBP16M4-001',
        price: 3499.00,
        comparePrice: 3699.00,
        costPrice: 2400.00,
        images: JSON.stringify(['/products/mbp16-1.jpg', '/products/mbp16-2.jpg', '/products/mbp16-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 2.14,
        categoryId: laptopCat.id,
        brandId: brands[0].id,
        avgRating: 4.9,
        reviewCount: 156,
        totalSold: 640,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sony WH-1000XM5',
        slug: 'sony-wh-1000xm5',
        description: 'Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones. Up to 30 hours of battery life with quick charging. Multipoint connection for seamless switching between devices.',
        shortDesc: 'Best-in-class ANC, 30hr battery, multipoint',
        sku: 'SNY-WH1000XM5-001',
        price: 349.99,
        comparePrice: 399.99,
        costPrice: 180.00,
        images: JSON.stringify(['/products/xm5-1.jpg', '/products/xm5-2.jpg', '/products/xm5-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 0.250,
        categoryId: headphonesCat.id,
        brandId: brands[2].id,
        avgRating: 4.7,
        reviewCount: 412,
        totalSold: 2800,
      },
    }),
    prisma.product.create({
      data: {
        name: 'iPad Pro 13" M4',
        slug: 'ipad-pro-13-m4',
        description: 'The thinnest, most advanced iPad ever with the M4 chip and a stunning 13-inch Ultra Retina XDR tandem OLED display. Compatible with Apple Pencil Pro and Magic Keyboard for the ultimate creative and productivity experience.',
        shortDesc: 'M4 chip, OLED display, Apple Pencil Pro',
        sku: 'APL-IPP13M4-001',
        price: 1099.00,
        comparePrice: 1199.00,
        costPrice: 700.00,
        images: JSON.stringify(['/products/ipadpro-1.jpg', '/products/ipadpro-2.jpg', '/products/ipadpro-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 0.579,
        categoryId: tabletCat.id,
        brandId: brands[0].id,
        avgRating: 4.7,
        reviewCount: 98,
        totalSold: 520,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Nike Air Max 90',
        slug: 'nike-air-max-90',
        description: 'An icon of street style, the Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays, and classic TPU details. Available in a wide range of colorways to fit your style.',
        shortDesc: 'Classic street style icon, visible Air cushioning',
        sku: 'NK-AM90-001',
        price: 130.00,
        comparePrice: 150.00,
        costPrice: 55.00,
        images: JSON.stringify(['/products/am90-1.jpg', '/products/am90-2.jpg', '/products/am90-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 0.4,
        categoryId: categories[3].id,
        brandId: brands[3].id,
        avgRating: 4.5,
        reviewCount: 567,
        totalSold: 4200,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Dell XPS 15',
        slug: 'dell-xps-15',
        description: 'Premium performance in a stunning design. Features a 15.6-inch OLED display, Intel Core i9 processor, NVIDIA RTX 4070 graphics, and up to 32GB RAM. The infinityEdge display delivers a virtually borderless viewing experience.',
        shortDesc: 'OLED display, i9, RTX 4070, premium build',
        sku: 'DEL-XPS15-001',
        price: 1999.99,
        comparePrice: 2199.99,
        costPrice: 1350.00,
        images: JSON.stringify(['/products/xps15-1.jpg', '/products/xps15-2.jpg', '/products/xps15-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 1.86,
        categoryId: laptopCat.id,
        brandId: brands[7].id,
        avgRating: 4.4,
        reviewCount: 203,
        totalSold: 780,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bose QuietComfort Ultra',
        slug: 'bose-quietcomfort-ultra',
        description: 'World-class noise cancellation meets spatial audio. The QuietComfort Ultra headphones deliver immersive sound with Bose Immersive Audio. CustomTune technology personalizes sound and noise cancellation to your unique ear shape.',
        shortDesc: 'Immersive Audio, CustomTune, world-class ANC',
        sku: 'BSE-QCU-001',
        price: 429.00,
        comparePrice: 449.00,
        costPrice: 220.00,
        images: JSON.stringify(['/products/qcultra-1.jpg', '/products/qcultra-2.jpg', '/products/qcultra-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 0.250,
        categoryId: headphonesCat.id,
        brandId: brands[6].id,
        avgRating: 4.5,
        reviewCount: 321,
        totalSold: 1950,
      },
    }),
    prisma.product.create({
      data: {
        name: 'KitchenAid Artisan Stand Mixer',
        slug: 'kitchenaid-artisan-stand-mixer',
        description: 'The iconic KitchenAid Artisan Series stand mixer with 5-quart stainless steel bowl. 10 mixing speeds and a powerful motor handle any recipe. Compatible with over 10 optional hub-powered attachments from pasta rollers to food grinders.',
        shortDesc: '5-qt bowl, 10 speeds, 10+ attachments',
        sku: 'KA-ARTISAN-001',
        price: 379.99,
        comparePrice: 449.99,
        costPrice: 190.00,
        images: JSON.stringify(['/products/ka-mixer-1.jpg', '/products/ka-mixer-2.jpg', '/products/ka-mixer-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 11.3,
        categoryId: categories[2].id,
        brandId: brands[5].id,
        avgRating: 4.8,
        reviewCount: 892,
        totalSold: 5600,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Adidas Ultraboost 24',
        slug: 'adidas-ultraboost-24',
        description: 'Run with responsive energy return. The Ultraboost 24 features a BOOST midsole for incredible energy return, a Primeknit+ upper for adaptive support, and a Continental rubber outsole for extraordinary grip in wet and dry conditions.',
        shortDesc: 'BOOST midsole, Primeknit+, Continental grip',
        sku: 'ADI-UB24-001',
        price: 190.00,
        comparePrice: 220.00,
        costPrice: 75.00,
        images: JSON.stringify(['/products/ub24-1.jpg', '/products/ub24-2.jpg', '/products/ub24-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 0.31,
        categoryId: categories[3].id,
        brandId: brands[4].id,
        avgRating: 4.6,
        reviewCount: 445,
        totalSold: 3100,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Samsung Galaxy Tab S9 Ultra',
        slug: 'samsung-galaxy-tab-s9-ultra',
        description: 'The biggest Galaxy Tab with a massive 14.6-inch Dynamic AMOLED 2X display. Powered by Snapdragon 8 Gen 2, with IP68 water resistance and an included S Pen. Perfect for productivity, creativity, and entertainment.',
        shortDesc: '14.6" AMOLED, S Pen, IP68 rated',
        sku: 'SAM-TABS9U-001',
        price: 1199.99,
        comparePrice: 1319.99,
        costPrice: 800.00,
        images: JSON.stringify(['/products/tabs9-1.jpg', '/products/tabs9-2.jpg', '/products/tabs9-3.jpg']),
        isFeatured: false,
        isActive: true,
        weight: 0.732,
        categoryId: tabletCat.id,
        brandId: brands[1].id,
        avgRating: 4.4,
        reviewCount: 87,
        totalSold: 340,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sony PlayStation 5 Slim',
        slug: 'sony-playstation-5-slim',
        description: 'Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with support for haptic feedback, adaptive triggers, and 3D Audio. The slimmer, lighter design takes up less space without compromising power.',
        shortDesc: 'Ultra-fast SSD, DualSense, 3D Audio',
        sku: 'SNY-PS5SLIM-001',
        price: 449.99,
        comparePrice: 499.99,
        costPrice: 300.00,
        images: JSON.stringify(['/products/ps5s-1.jpg', '/products/ps5s-2.jpg', '/products/ps5s-3.jpg']),
        isFeatured: true,
        isActive: true,
        weight: 3.2,
        categoryId: categories[0].id,
        brandId: brands[2].id,
        avgRating: 4.8,
        reviewCount: 678,
        totalSold: 8900,
      },
    }),
  ])

  // ============================================================================
  // PRODUCT VARIANTS
  // ============================================================================
  const iphoneVariants = await Promise.all([
    prisma.productVariant.create({ data: { productId: products[0].id, name: '256GB Natural Titanium', sku: 'APL-IP16PM-256-NT', price: 1199.00, attributes: JSON.stringify({ storage: '256GB', color: 'Natural Titanium' }) }}),
    prisma.productVariant.create({ data: { productId: products[0].id, name: '512GB Desert Titanium', sku: 'APL-IP16PM-512-DT', price: 1399.00, attributes: JSON.stringify({ storage: '512GB', color: 'Desert Titanium' }) }}),
    prisma.productVariant.create({ data: { productId: products[0].id, name: '1TB Black Titanium', sku: 'APL-IP16PM-1T-BT', price: 1599.00, attributes: JSON.stringify({ storage: '1TB', color: 'Black Titanium' }) }}),
  ])

  // ============================================================================
  // INVENTORY
  // ============================================================================
  for (const product of products) {
    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: Math.floor(Math.random() * 200) + 20,
        reserved: Math.floor(Math.random() * 10),
        lowStockThreshold: 10,
        sku: product.sku,
      },
    })
  }

  // Variant inventory
  for (const variant of iphoneVariants) {
    await prisma.inventory.create({
      data: {
        productId: products[0].id,
        variantId: variant.id,
        quantity: Math.floor(Math.random() * 100) + 10,
        reserved: Math.floor(Math.random() * 5),
        lowStockThreshold: 5,
        sku: variant.sku,
      },
    })
  }

  // ============================================================================
  // PRODUCT TAGS
  // ============================================================================
  const tags = [
    { productId: products[0].id, tag: 'flagship' },
    { productId: products[0].id, tag: '5g' },
    { productId: products[1].id, tag: 'ai' },
    { productId: products[1].id, tag: '5g' },
    { productId: products[2].id, tag: 'professional' },
    { productId: products[2].id, tag: 'creator' },
    { productId: products[3].id, tag: 'noise-cancelling' },
    { productId: products[3].id, tag: 'wireless' },
    { productId: products[4].id, tag: 'creative' },
    { productId: products[11].id, tag: 'gaming' },
    { productId: products[11].id, tag: 'best-seller' },
    { productId: products[8].id, tag: 'best-seller' },
  ]

  for (const t of tags) {
    await prisma.productTag.create({ data: t })
  }

  // ============================================================================
  // COUPONS
  // ============================================================================
  await prisma.coupon.create({ data: { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minPurchase: 50, isActive: true, usageLimit: 1000, usedCount: 45 }})
  await prisma.coupon.create({ data: { code: 'SAVE25', type: 'FIXED', value: 25, minPurchase: 100, isActive: true, usageLimit: 500, usedCount: 123 }})
  await prisma.coupon.create({ data: { code: 'FLASH20', type: 'PERCENTAGE', value: 20, maxDiscount: 100, minPurchase: 75, isActive: true, usageLimit: 200, usedCount: 78, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }})

  // ============================================================================
  // BANNERS
  // ============================================================================
  await prisma.banner.create({ data: { title: 'Summer Tech Sale', subtitle: 'Up to 40% off on premium electronics', image: '/banners/summer-tech.jpg', link: '/products?category=electronics', buttonText: 'Shop Now', position: 'HERO', isActive: true, sortOrder: 1 }})
  await prisma.banner.create({ data: { title: 'New Arrivals', subtitle: 'Discover the latest in fashion and lifestyle', image: '/banners/new-arrivals.jpg', link: '/products?tag=new', buttonText: 'Explore', position: 'HERO', isActive: true, sortOrder: 2 }})
  await prisma.banner.create({ data: { title: 'Free Shipping', subtitle: 'On orders over $50', image: '/banners/free-shipping.jpg', position: 'SIDEBAR', isActive: true, sortOrder: 1 }})

  // ============================================================================
  // ADDRESSES
  // ============================================================================
  await prisma.address.create({ data: { userId: customer1.id, label: 'Home', firstName: 'John', lastName: 'Doe', street1: '123 Main St', street2: 'Apt 4B', city: 'New York', state: 'NY', postalCode: '10001', country: 'US', phone: '+1234567890', isDefault: true }})

  // ============================================================================
  // ORDERS (sample data)
  // ============================================================================
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'SF-2024-001',
      userId: customer1.id,
      status: 'DELIVERED',
      subtotal: 1549.99,
      taxAmount: 124.00,
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount: 1673.99,
      shippingAddress: JSON.stringify({ firstName: 'John', lastName: 'Doe', street1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' }),
      billingAddress: JSON.stringify({ firstName: 'John', lastName: 'Doe', street1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' }),
      shippingMethod: 'Standard',
      items: {
        create: [
          { productId: products[3].id, productName: 'Sony WH-1000XM5', sku: 'SNY-WH1000XM5-001', price: 349.99, quantity: 1, total: 349.99, image: '/products/xm5-1.jpg' },
          { productId: products[0].id, productName: 'iPhone 16 Pro Max', sku: 'APL-IP16PM-001', price: 1199.00, quantity: 1, total: 1199.00, image: '/products/iphone16-1.jpg' },
        ],
      },
    },
  })

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      method: 'STRIPE',
      status: 'COMPLETED',
      transactionId: 'pi_test_123456',
      amount: 1673.99,
      stripePaymentIntentId: 'pi_test_123456',
    },
  })

  await prisma.orderTimeline.createMany({
    data: [
      { orderId: order1.id, status: 'PENDING', message: 'Order placed', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { orderId: order1.id, status: 'PAID', message: 'Payment confirmed', createdAt: new Date(Date.now() - 6.9 * 24 * 60 * 60 * 1000) },
      { orderId: order1.id, status: 'PROCESSING', message: 'Order is being prepared', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
      { orderId: order1.id, status: 'SHIPPED', message: 'Package shipped via FedEx', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { orderId: order1.id, status: 'DELIVERED', message: 'Package delivered', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    ],
  })

  // Second order (processing)
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'SF-2024-002',
      userId: customer1.id,
      status: 'PROCESSING',
      subtotal: 379.99,
      taxAmount: 30.40,
      shippingAmount: 9.99,
      discountAmount: 37.99,
      totalAmount: 382.39,
      shippingAddress: JSON.stringify({ firstName: 'John', lastName: 'Doe', street1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' }),
      billingAddress: JSON.stringify({ firstName: 'John', lastName: 'Doe', street1: '123 Main St', city: 'New York', state: 'NY', postalCode: '10001', country: 'US' }),
      shippingMethod: 'Express',
      items: {
        create: [
          { productId: products[8].id, productName: 'KitchenAid Artisan Stand Mixer', sku: 'KA-ARTISAN-001', price: 379.99, quantity: 1, total: 379.99, image: '/products/ka-mixer-1.jpg' },
        ],
      },
    },
  })

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      method: 'STRIPE',
      status: 'COMPLETED',
      transactionId: 'pi_test_789012',
      amount: 382.39,
      stripePaymentIntentId: 'pi_test_789012',
    },
  })

  // ============================================================================
  // REVIEWS
  // ============================================================================
  await prisma.review.create({ data: { userId: customer1.id, productId: products[0].id, rating: 5, title: 'Best iPhone yet!', content: 'The camera system is incredible and the battery lasts all day. Titanium build feels premium. Coming from an iPhone 14 Pro, the upgrade is significant especially in low-light photography.', isVerified: true, isApproved: true, helpfulYes: 23, helpfulNo: 2 }})
  await prisma.review.create({ data: { userId: customer2.id, productId: products[0].id, rating: 4, title: 'Great phone, expensive', content: 'Amazing performance and camera quality. The A18 Pro chip handles everything I throw at it. Only downside is the price point - it is a significant investment. Still, worth it if you use your phone as your primary device.', isVerified: true, isApproved: true, helpfulYes: 15, helpfulNo: 1 }})
  await prisma.review.create({ data: { userId: customer1.id, productId: products[3].id, rating: 5, title: 'ANC king', content: 'The noise cancellation is phenomenal. I use these daily on my commute and in the office. The 30-hour battery life means I only charge once a week. Sound quality is rich and detailed.', isVerified: true, isApproved: true, helpfulYes: 45, helpfulNo: 3 }})
  await prisma.review.create({ data: { userId: customer2.id, productId: products[8].id, rating: 5, title: 'Kitchen essential', content: 'This mixer is a game changer for baking. Powerful motor, smooth operation, and the attachments are worth every penny. Made bread dough, whipped cream, and pasta with ease. Highly recommend!', isVerified: true, isApproved: true, helpfulYes: 67, helpfulNo: 1 }})
  await prisma.review.create({ data: { userId: customer2.id, productId: products[11].id, rating: 5, title: 'Next-gen gaming', content: 'The loading speeds are insane - games start in seconds. DualSense controller is a revelation with haptic feedback. The slim design fits perfectly in my entertainment center. Best console purchase ever.', isVerified: true, isApproved: true, helpfulYes: 34, helpfulNo: 2 }})

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  await prisma.notification.create({ data: { userId: customer1.id, type: 'ORDER', title: 'Order Delivered', message: 'Your order SF-2024-001 has been delivered!', link: '/account/orders/SF-2024-001' }})
  await prisma.notification.create({ data: { userId: customer1.id, type: 'PROMO', title: 'Summer Sale', message: 'Get 20% off with code FLASH20 this week!', link: '/products?sale=true' }})
  await prisma.notification.create({ data: { userId: customer1.id, type: 'SYSTEM', title: 'Welcome to ShopForge', message: 'Thanks for joining! Use WELCOME10 for 10% off your first order.' }})

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  await prisma.auditLog.create({ data: { userId: adminUser.id, action: 'CREATE', entity: 'Product', entityId: products[0].id, details: JSON.stringify({ name: products[0].name }) }})
  await prisma.auditLog.create({ data: { userId: adminUser.id, action: 'CREATE', entity: 'Coupon', details: JSON.stringify({ code: 'WELCOME10' }) }})

  // ============================================================================
  // STORE SETTINGS
  // ============================================================================
  await prisma.storeSettings.create({ data: { key: 'store_name', value: JSON.stringify('ShopForge'), description: 'Store display name' }})
  await prisma.storeSettings.create({ data: { key: 'tax_rate', value: JSON.stringify(0.08), description: 'Default tax rate' }})
  await prisma.storeSettings.create({ data: { key: 'free_shipping_min', value: JSON.stringify(50), description: 'Minimum order for free shipping' }})
  await prisma.storeSettings.create({ data: { key: 'currency', value: JSON.stringify('USD'), description: 'Default currency' }})

  // ============================================================================
  // FLASH SALE
  // ============================================================================
  const flashSale = await prisma.flashSale.create({
    data: {
      name: 'Weekend Flash Sale',
      description: 'Limited time deals on top electronics',
      startsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  })

  await prisma.flashSaleProduct.create({ data: { flashSaleId: flashSale.id, productId: products[3].id, salePrice: 249.99, quantityLimit: 2 }})
  await prisma.flashSaleProduct.create({ data: { flashSaleId: flashSale.id, productId: products[7].id, salePrice: 329.00, quantityLimit: 1 }})

  console.log('✅ Seed data created successfully!')
  console.log(`   - ${categories.length} categories + ${subCategories.length} subcategories`)
  console.log(`   - ${brands.length} brands`)
  console.log(`   - ${products.length} products`)
  console.log(`   - 3 users (1 admin, 2 customers)`)
  console.log(`   - 3 coupons`)
  console.log(`   - 2 sample orders`)
  console.log(`   - 5 reviews`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
