import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createATR = async (req, res) => {
  try {
    const { refNumber, formData, signature } = req.body;

    const existing = await prisma.atrRequest.findUnique({ where: { refNumber } });
    if (existing) return res.status(400).json({ error: 'Reference number already exists.' });

    // Multi-table transactional create (Request + Initial Unit Signature)
    const newRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.atrRequest.create({
        data: {
          refNumber,
          formData,
          status: 'AMS' // Passes step to initial auth queue block
        }
      });

      if (signature) {
        await tx.signature.create({
          data: {
            atrRequestId: request.id,
            role: req.user.role,
            imageBlob: signature.imageBlob,
            signedBy: req.user.username
          }
        });
      }
      return request;
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listATRs = async (req, res) => {
  try {
    // Return workflows visible or actionable by user status role
    const requests = await prisma.atrRequest.findMany({
      include: { signatures: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getATRById = async (req, res) => {
  try {
    const request = await prisma.atrRequest.findUnique({
      where: { id: req.params.id },
      include: { signatures: true }
    });
    if (!request) return res.status(404).json({ error: 'ATR not found.' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const advanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureBlob, signedBy } = req.body;

    const statusWorkflow = ['REQUESTING_UNIT', 'AMS', 'SO3_AIR_PREP', 'D_AIR', 'COMD', 'ADS', 'APPROVED'];

    const request = await prisma.atrRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'ATR not found' });

    const currentIdx = statusWorkflow.indexOf(request.status);
    const nextStatus = statusWorkflow[currentIdx + 1];

    if (!nextStatus) return res.status(400).json({ error: 'Workflow already completed' });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.signature.create({
        data: {
          atrRequestId: id,
          role: req.user.role,
          imageBlob: signatureBlob,
          signedBy: signedBy || req.user.username
        }
      });

      return await tx.atrRequest.update({
        where: { id },
        data: { status: nextStatus }
      });
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
