import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logAuditEvent, extractRequestMetadata } from '@/lib/audit'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: invoiceId },
    include: {
      user: { select: { name: true, wallet: { select: { address: true } } } },
    },
  })

  if (!invoice)
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  logAuditEvent(
    invoice.id,
    'invoice.viewed',
    null,
    extractRequestMetadata(request.headers),
  ).catch((error) => {
    logger.error({ err: error }, 'Failed to log invoice.viewed audit event')
  })

  return NextResponse.json({
    invoiceNumber: invoice.invoiceNumber,
    freelancerName: invoice.user.name || 'Freelancer',
    description: invoice.description,
    amount: Number(invoice.amount),
    status: invoice.status,
    dueDate: invoice.dueDate,
    walletAddress: invoice.user.wallet?.address,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: invoiceId },
  })

  if (!invoice || invoice.status !== 'pending') {
    return NextResponse.json({ error: 'Invalid invoice' }, { status: 400 })
  }

  const settled = await prisma.$transaction(async (tx: any) => {
    const now = new Date()

    const updateResult = await tx.invoice.updateMany({
      where: { id: invoice.id, status: 'pending' },
      data: { status: 'paid', paidAt: now },
    })

    if (updateResult.count === 0) return false

    await tx.transaction.create({
      data: {
        userId: invoice.userId,
        type: 'incoming',
        status: 'completed',
        amount: invoice.amount,
        currency: invoice.currency,
        invoiceId: invoice.id,
        completedAt: now,
      },
    })

    await logAuditEvent(
      invoice.id,
      'invoice.paid',
      null,
      extractRequestMetadata(request.headers),
      tx,
    )

    return true
  })

  if (!settled) {
    return NextResponse.json({ error: 'Invalid invoice' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
