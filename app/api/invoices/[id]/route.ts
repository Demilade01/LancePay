import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      invoiceNumber: true,
      clientEmail: true,
      clientName: true,
      description: true,
      amount: true,
      currency: true,
      status: true,
      paymentLink: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  return NextResponse.json({ ...invoice, amount: Number(invoice.amount) })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { action } = await request.json()

  if (action === 'cancel') {
    if (invoice.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invoices can be cancelled' },
        { status: 400 },
      )
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled by freelancer',
      },
    })

    return NextResponse.json({ ...updated, amount: Number(updated.amount) })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
