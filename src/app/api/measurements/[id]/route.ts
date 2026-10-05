import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const measurement = await prisma.measurementSet.update({
    where: { id },
    data: {
      chest: body.chest ?? null,
      stomach: body.stomach ?? null,
      hips: body.hips ?? null,
      shoulder: body.shoulder ?? null,
      sleeveLength: body.sleeveLength ?? null,
      bicep: body.bicep ?? null,
      neck: body.neck ?? null,
      waist: body.waist ?? null,
      trouserLength: body.trouserLength ?? null,
      thigh: body.thigh ?? null,
      knee: body.knee ?? null,
      bottom: body.bottom ?? null,
      fork: body.fork ?? null,
      allRound: body.allRound ?? null,
      calf: body.calf ?? null,
      inSeam: body.inSeam ?? null,
      sherwaniLength: body.sherwaniLength ?? null,
      jacketLength: body.jacketLength ?? null,
      kurtalength: body.kurtalength ?? null,
      indoWesternLength: body.indoWesternLength ?? null,
      suitLength: body.suitLength ?? null,
      notes: body.notes ?? null,
    },
  })

  return NextResponse.json(measurement)
}
