const { prisma } = require('../config/database');

/**
 * Create a new campaign
 */
async function createCampaign({ userId, name, fptAppConfigId, fptOaConfigId, templateId, totalMessages, source = 'PORTAL' }) {
  const configId = fptAppConfigId || fptOaConfigId;
  return prisma.campaign.create({
    data: {
      userId,
      name,
      fptAppConfigId: configId,
      templateId,
      totalMessages,
      source,
      status: 'PENDING',
    },
  });
}

/**
 * Get campaigns with filtering
 */
async function getCampaigns({ userId, status, page = 1, limit = 20 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, companyName: true } },
        fptAppConfig: { select: { id: true, oaName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  const formattedData = data.map((c) => ({
    ...c,
    fptOaConfig: c.fptAppConfig,
  }));

  return { data: formattedData, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get campaign by ID
 */
async function getCampaignById(id) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true } },
      fptAppConfig: { select: { id: true, oaName: true } },
    },
  });

  if (campaign) {
    campaign.fptOaConfig = campaign.fptAppConfig;
  }

  return campaign;
}

/**
 * Update campaign status
 */
async function updateCampaignStatus(id, status) {
  return prisma.campaign.update({ where: { id }, data: { status } });
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaignStatus,
};
