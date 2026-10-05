import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const styles = [
  { code: 'BG-001', name: 'Classic Bandhgala', category: 'Bandhgala', price: 28000, fabric: 'Italian Wool', pieces: 1, color: 'Navy Blue' },
  { code: 'BG-002', name: 'Embroidered Bandhgala', category: 'Bandhgala', price: 35000, fabric: 'Raw Silk', pieces: 1, color: 'Maroon' },
  { code: 'BG-003', name: 'Velvet Bandhgala', category: 'Bandhgala', price: 42000, fabric: 'Velvet', pieces: 1, color: 'Black' },
  { code: 'BG-004', name: 'Nehru Jacket Bandhgala', category: 'Bandhgala', price: 26000, fabric: 'Linen Blend', pieces: 1, color: 'Beige' },
  { code: 'SH-001', name: 'Classic Sherwani', category: 'Sherwani', price: 45000, fabric: 'Brocade Silk', pieces: 1, color: 'Ivory' },
  { code: 'SH-002', name: 'Embroidered Sherwani', category: 'Sherwani', price: 65000, fabric: 'Georgette', pieces: 1, color: 'Gold' },
  { code: 'SH-003', name: 'Lucknowi Sherwani', category: 'Sherwani', price: 55000, fabric: 'Chikankari', pieces: 1, color: 'White' },
  { code: 'SH-004', name: 'Velvet Sherwani', category: 'Sherwani', price: 72000, fabric: 'Velvet', pieces: 1, color: 'Wine' },
  { code: 'SH-005', name: 'Floral Sherwani', category: 'Sherwani', price: 58000, fabric: 'Organza', pieces: 1, color: 'Peach' },
  { code: 'SU-001', name: 'Two-Piece Suit', category: 'Suits', price: 32000, fabric: 'Italian Wool', pieces: 2, color: 'Charcoal' },
  { code: 'SU-002', name: 'Three-Piece Suit', category: 'Suits', price: 42000, fabric: 'Merino Wool', pieces: 3, color: 'Navy Blue' },
  { code: 'SU-003', name: 'Tuxedo', category: 'Suits', price: 48000, fabric: 'Super 120s Wool', pieces: 2, color: 'Black' },
  { code: 'SU-004', name: 'Linen Suit', category: 'Suits', price: 28000, fabric: 'Irish Linen', pieces: 2, color: 'Cream' },
  { code: 'SU-005', name: 'Double-Breasted Suit', category: 'Suits', price: 38000, fabric: 'Flannel', pieces: 2, color: 'Grey' },
  { code: 'KU-001', name: 'Silk Kurta', category: 'Kurta', price: 12000, fabric: 'Pure Silk', pieces: 1, color: 'Off-White' },
  { code: 'KU-002', name: 'Embroidered Kurta', category: 'Kurta', price: 18000, fabric: 'Cotton Silk', pieces: 1, color: 'Sky Blue' },
  { code: 'KU-003', name: 'Lucknowi Kurta', category: 'Kurta', price: 15000, fabric: 'Chikankari Cotton', pieces: 1, color: 'White' },
  { code: 'KU-004', name: 'Pathani Kurta', category: 'Kurta', price: 10000, fabric: 'Cotton', pieces: 1, color: 'Olive' },
  { code: 'KU-005', name: 'Angrakha Kurta', category: 'Kurta', price: 16000, fabric: 'Chanderi', pieces: 1, color: 'Mustard' },
  { code: 'JK-001', name: 'Nehru Jacket', category: 'Jacket', price: 22000, fabric: 'Silk Brocade', pieces: 1, color: 'Royal Blue' },
  { code: 'JK-002', name: 'Blazer', category: 'Jacket', price: 26000, fabric: 'Tweed', pieces: 1, color: 'Brown' },
  { code: 'JK-003', name: 'Jodhpuri Jacket', category: 'Jacket', price: 28000, fabric: 'Wool Blend', pieces: 1, color: 'Burgundy' },
  { code: 'JK-004', name: 'Quilted Jacket', category: 'Jacket', price: 18000, fabric: 'Velvet', pieces: 1, color: 'Forest Green' },
  { code: 'WC-001', name: 'Silk Waistcoat', category: 'Waistcoat', price: 12000, fabric: 'Pure Silk', pieces: 1, color: 'Silver' },
  { code: 'WC-002', name: 'Brocade Waistcoat', category: 'Waistcoat', price: 15000, fabric: 'Brocade', pieces: 1, color: 'Gold' },
  { code: 'WC-003', name: 'Wool Waistcoat', category: 'Waistcoat', price: 14000, fabric: 'Merino Wool', pieces: 1, color: 'Charcoal' },
  { code: 'TR-001', name: 'Classic Trouser', category: 'Trouser', price: 8000, fabric: 'Wool', pieces: 1, color: 'Black' },
  { code: 'TR-002', name: 'Churidar', category: 'Trouser', price: 6000, fabric: 'Cotton Silk', pieces: 1, color: 'Cream' },
  { code: 'TR-003', name: 'Dhoti Pant', category: 'Trouser', price: 7000, fabric: 'Silk', pieces: 1, color: 'Gold' },
  { code: 'IW-001', name: 'Indo-Western Sherwani', category: 'Indo-Western', price: 52000, fabric: 'Art Silk', pieces: 1, color: 'Teal' },
  { code: 'IW-002', name: 'Indo-Western Jacket', category: 'Indo-Western', price: 35000, fabric: 'Raw Silk', pieces: 1, color: 'Mauve' },
  { code: 'IW-003', name: 'Asymmetric Kurta', category: 'Indo-Western', price: 22000, fabric: 'Georgette', pieces: 1, color: 'Blush Pink' },
]

const PRODUCTION_STAGES = [
  'Order Placed', 'Fabric Issued', 'Cutting', 'Embroidery', 'Stitching',
  'Finishing', 'Quality Check', 'Ready for Trial', 'Alteration',
  'Ready for Delivery', 'Delivered',
]

const customers = [
  { name: 'Rajesh Malhotra', mobile: '9876543210', email: 'rajesh.m@email.com', city: 'Delhi', countryCode: '+91' },
  { name: 'Vikram Singh', mobile: '9876543211', email: 'vikram.s@email.com', city: 'Mumbai', countryCode: '+91' },
  { name: 'Arjun Kapoor', mobile: '9876543212', email: 'arjun.k@email.com', city: 'Jaipur', countryCode: '+91' },
  { name: 'Karan Mehra', mobile: '9876543213', email: 'karan.m@email.com', city: 'Chandigarh', countryCode: '+91' },
  { name: 'Siddharth Gupta', mobile: '9876543214', email: 'sid.g@email.com', city: 'Lucknow', countryCode: '+91' },
  { name: 'Aditya Sharma', mobile: '9876543215', email: 'aditya.s@email.com', city: 'Delhi', countryCode: '+91' },
  { name: 'Rohit Verma', mobile: '9876543216', email: null, city: 'Noida', countryCode: '+91' },
  { name: 'Manish Tiwari', mobile: '9876543217', email: 'manish.t@email.com', city: 'Gurgaon', countryCode: '+91' },
]

async function main() {
  console.log('Clearing existing data...')
  await prisma.todoComment.deleteMany()
  await prisma.todoItem.deleteMany()
  await prisma.footfall.deleteMany()
  await prisma.alteration.deleteMany()
  await prisma.trial.deleteMany()
  await prisma.stageHistory.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.job.deleteMany()
  await prisma.order.deleteMany()
  await prisma.estimate.deleteMany()
  await prisma.measurementSet.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.style.deleteMany()
  await prisma.counter.deleteMany()

  console.log('Seeding styles...')
  const styleMap: Record<string, string> = {}
  for (const s of styles) {
    const created = await prisma.style.create({
      data: {
        styleCode: s.code,
        name: s.name,
        category: s.category,
        price: s.price,
        fabric: s.fabric,
        pieces: s.pieces,
        color: s.color,
        status: 'Active',
      },
    })
    styleMap[s.code] = created.id
  }

  console.log('Seeding customers...')
  let custCounter = 0
  const customerIds: string[] = []
  const measurementIds: string[] = []

  for (const c of customers) {
    custCounter++
    const cust = await prisma.customer.create({
      data: {
        customerId: `CUST-${String(custCounter).padStart(4, '0')}`,
        name: c.name,
        countryCode: c.countryCode,
        mobile: c.mobile,
        email: c.email,
        city: c.city,
        customNotes: custCounter <= 3 ? 'Prefers slim fit. Always wants extra fabric swatch.' : null,
      },
    })
    customerIds.push(cust.id)

    const ms = await prisma.measurementSet.create({
      data: {
        customerId: cust.id,
        version: 1,
        chest: 38 + Math.random() * 6,
        stomach: 34 + Math.random() * 8,
        hips: 38 + Math.random() * 6,
        shoulder: 17 + Math.random() * 2,
        sleeveLength: 24 + Math.random() * 3,
        bicep: 13 + Math.random() * 2,
        neck: 15 + Math.random() * 2,
        waist: 32 + Math.random() * 6,
        trouserLength: 40 + Math.random() * 4,
        thigh: 22 + Math.random() * 4,
        knee: 16 + Math.random() * 2,
        bottom: 14 + Math.random() * 2,
        fork: 10 + Math.random() * 2,
        allRound: 40 + Math.random() * 6,
        calf: 14 + Math.random() * 2,
        inSeam: 30 + Math.random() * 4,
        sherwaniLength: 40 + Math.random() * 4,
        jacketLength: 28 + Math.random() * 3,
        kurtalength: 38 + Math.random() * 4,
        indoWesternLength: 36 + Math.random() * 4,
        suitLength: 30 + Math.random() * 3,
      },
    })
    measurementIds.push(ms.id)
  }

  console.log('Seeding orders at various production stages...')
  let orderCounter = 1000
  const channels = ['In-Store', 'WhatsApp Online', 'Shopify/Website']

  const orderDefs = [
    { custIdx: 0, items: [{ garment: 'Three-Piece Suit', amount: 42000, styleCode: 'SU-002' }, { garment: 'Classic Trouser', amount: 8000, styleCode: 'TR-001' }], stages: ['Stitching', 'Cutting'], daysOut: 18, channel: 'In-Store' },
    { custIdx: 1, items: [{ garment: 'Classic Sherwani', amount: 45000, styleCode: 'SH-001' }, { garment: 'Churidar', amount: 6000, styleCode: 'TR-002' }], stages: ['Embroidery', 'Stitching'], daysOut: 22, channel: 'In-Store' },
    { custIdx: 2, items: [{ garment: 'Embroidered Bandhgala', amount: 35000, styleCode: 'BG-002' }], stages: ['Ready for Trial'], daysOut: 10, channel: 'WhatsApp Online' },
    { custIdx: 3, items: [{ garment: 'Tuxedo', amount: 48000, styleCode: 'SU-003' }, { garment: 'Silk Waistcoat', amount: 12000, styleCode: 'WC-001' }], stages: ['Quality Check', 'Finishing'], daysOut: 8, channel: 'In-Store' },
    { custIdx: 4, items: [{ garment: 'Indo-Western Sherwani', amount: 52000, styleCode: 'IW-001' }], stages: ['Ready for Delivery'], daysOut: 3, channel: 'Shopify/Website' },
    { custIdx: 5, items: [{ garment: 'Two-Piece Suit', amount: 32000, styleCode: 'SU-001' }], stages: ['Order Placed'], daysOut: 30, channel: 'WhatsApp Online' },
    { custIdx: 0, items: [{ garment: 'Velvet Sherwani', amount: 72000, styleCode: 'SH-004' }, { garment: 'Dhoti Pant', amount: 7000, styleCode: 'TR-003' }], stages: ['Delivered', 'Delivered'], daysOut: -5, status: 'Completed', channel: 'In-Store' },
  ]

  for (const od of orderDefs) {
    orderCounter++
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + od.daysOut)

    const totalAmount = od.items.reduce((s, it) => s + it.amount, 0)
    const discountAmount = Math.round(totalAmount * 0.1)
    const netPayable = totalAmount - discountAmount
    const advancePaid = Math.round(netPayable * 0.5)

    const order = await prisma.order.create({
      data: {
        orderNumber: orderCounter,
        customerId: customerIds[od.custIdx],
        deliveryDate,
        channel: od.channel,
        totalAmount,
        discountType: 'percentage',
        discountValue: 10,
        discountAmount,
        netPayable,
        advancePaid,
        balanceDue: netPayable - advancePaid,
        status: od.status || 'Active',
      },
    })

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: advancePaid,
        method: ['Cash', 'UPI', 'Card', 'Razorpay'][Math.floor(Math.random() * 4)],
        notes: 'Advance payment',
      },
    })

    for (let i = 0; i < od.items.length; i++) {
      const item = od.items[i]
      const stage = od.stages[i] || 'Order Placed'
      const stageIdx = PRODUCTION_STAGES.indexOf(stage)
      const jobNumber = `${orderCounter}-${String(i + 1).padStart(2, '0')}`

      const style = styles.find(s => s.code === item.styleCode)
      const piecesCount = style?.pieces || 1

      if (piecesCount > 1) {
        const pieceNames = style?.category === 'Suits'
          ? ['Blazer', 'Trouser', 'Waistcoat'].slice(0, piecesCount)
          : Array.from({ length: piecesCount }, (_, k) => `Piece ${k + 1}`)
        const perPieceAmount = Math.round(item.amount / piecesCount)

        for (let p = 0; p < piecesCount; p++) {
          const pieceJobNumber = `${orderCounter}-${String(i + 1).padStart(2, '0')}${String.fromCharCode(65 + p)}`
          const job = await prisma.job.create({
            data: {
              jobNumber: pieceJobNumber,
              orderId: order.id,
              styleId: styleMap[item.styleCode] || null,
              garmentType: `${item.garment} - ${pieceNames[p]}`,
              amount: perPieceAmount,
              measurementSetId: measurementIds[od.custIdx],
              deliveryDate,
              currentStage: stage,
            },
          })
          for (let s = 0; s <= stageIdx; s++) {
            const histDate = new Date()
            histDate.setDate(histDate.getDate() - (stageIdx - s) * 2)
            await prisma.stageHistory.create({
              data: { jobId: job.id, stage: PRODUCTION_STAGES[s], createdAt: histDate },
            })
          }
        }
      } else {
        const job = await prisma.job.create({
          data: {
            jobNumber,
            orderId: order.id,
            styleId: styleMap[item.styleCode] || null,
            garmentType: item.garment,
            amount: item.amount,
            measurementSetId: measurementIds[od.custIdx],
            deliveryDate,
            currentStage: stage,
          },
        })
        for (let s = 0; s <= stageIdx; s++) {
          const histDate = new Date()
          histDate.setDate(histDate.getDate() - (stageIdx - s) * 2)
          await prisma.stageHistory.create({
            data: { jobId: job.id, stage: PRODUCTION_STAGES[s], createdAt: histDate },
          })
        }
      }
    }
  }

  console.log('Seeding estimates...')
  let estCounter = 0

  const estimateDefs = [
    { custIdx: 6, items: [{ garment: 'Lucknowi Sherwani', amount: 55000 }, { garment: 'Churidar', amount: 6000 }], status: 'Created', channel: 'In-Store' },
    { custIdx: 7, items: [{ garment: 'Nehru Jacket', amount: 22000 }], status: 'Created', channel: 'WhatsApp Online' },
    { custIdx: 5, items: [{ garment: 'Embroidered Sherwani', amount: 65000 }, { garment: 'Dhoti Pant', amount: 7000 }, { garment: 'Brocade Waistcoat', amount: 15000 }], status: 'Created', channel: 'In-Store' },
  ]

  for (const ed of estimateDefs) {
    estCounter++
    const totalAmount = ed.items.reduce((s, it) => s + it.amount, 0)
    await prisma.estimate.create({
      data: {
        estimateNumber: estCounter,
        customerId: customerIds[ed.custIdx],
        customerName: customers[ed.custIdx].name,
        mobile: customers[ed.custIdx].mobile,
        trialDate: new Date(Date.now() + 14 * 86400000),
        deliveryDate: new Date(Date.now() + 30 * 86400000),
        items: JSON.stringify(ed.items),
        totalAmount,
        discountType: 'percentage',
        discountValue: 5,
        discountAmount: Math.round(totalAmount * 0.05),
        netPayable: totalAmount - Math.round(totalAmount * 0.05),
        advanceAmount: Math.round(totalAmount * 0.3),
        advancePaymentMode: 'UPI',
        balancePayment: totalAmount - Math.round(totalAmount * 0.05) - Math.round(totalAmount * 0.3),
        channel: ed.channel,
        status: ed.status,
      },
    })
  }

  console.log('Seeding footfall...')
  const footfallEntries = [
    { customerName: 'Amit Patel', mobile: '9988776655', visitSource: 'Instagram', followUpStatus: 'Interested', notes: 'Wants sherwani for wedding' },
    { customerName: 'Suresh Kumar', mobile: '9988776656', visitSource: 'Google', followUpStatus: 'Pending', notes: 'Looking for suits' },
    { customerName: 'Deepak Jain', mobile: '9988776657', visitSource: 'Reference', referenceCustomer: 'Rajesh Malhotra', followUpStatus: 'Converted', notes: 'Converted to estimate' },
    { customerName: 'Prashant Rao', mobile: '9988776658', visitSource: 'Walk-in', followUpStatus: 'Not Interested', notes: 'Just browsing' },
    { customerName: 'Nikhil Bansal', mobile: '9988776659', visitSource: 'Instagram', followUpStatus: 'Follow Up', notes: 'Wants bandhgala for reception' },
  ]
  for (const f of footfallEntries) {
    await prisma.footfall.create({ data: f })
  }

  console.log('Seeding todo items...')
  let todoCounter = 0
  const todoDefs = [
    { title: 'Call fabric supplier for silk restock', assignedTo: 'Akhil', deadline: new Date(Date.now() + 2 * 86400000), status: 'Pending' },
    { title: 'Follow up with Vikram Singh for balance payment', assignedTo: 'Akhil', deadline: new Date(Date.now() + 1 * 86400000), status: 'In Progress' },
    { title: 'Update style prices for new season', assignedTo: 'Store Manager', deadline: new Date(Date.now() + 7 * 86400000), status: 'Pending' },
    { title: 'Arrange trial for Arjun Kapoor', assignedTo: 'Akhil', deadline: new Date(Date.now() - 1 * 86400000), status: 'Pending' },
  ]
  for (const td of todoDefs) {
    todoCounter++
    const todo = await prisma.todoItem.create({
      data: {
        todoId: `TODO-${String(todoCounter).padStart(4, '0')}`,
        title: td.title,
        assignedTo: td.assignedTo,
        deadline: td.deadline,
        status: td.status,
      },
    })
    if (todoCounter === 2) {
      await prisma.todoComment.create({
        data: { todoId: todo.id, author: 'Akhil', content: 'Called today, will pay by tomorrow.' },
      })
    }
  }

  await prisma.counter.create({ data: { id: 'customer', value: custCounter } })
  await prisma.counter.create({ data: { id: 'order', value: orderCounter } })
  await prisma.counter.create({ data: { id: 'estimate', value: estCounter } })
  await prisma.counter.create({ data: { id: 'todo', value: todoCounter } })

  console.log(`Seeded ${styles.length} styles, ${customers.length} customers, ${orderDefs.length} orders, ${estimateDefs.length} estimates, ${footfallEntries.length} footfall entries, ${todoDefs.length} todos.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
