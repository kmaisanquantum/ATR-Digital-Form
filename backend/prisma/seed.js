import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { username: 'requester@pngdf.mil.pg', role: 'Requesting Unit' },
    { username: 'ams@pngdf.mil.pg', role: 'AMS' },
    { username: 'so3airprep@pngdf.mil.pg', role: 'SO3 Air Prep' },
    { username: 'dair@pngdf.mil.pg', role: 'D Air' },
    { username: 'comd@pngdf.mil.pg', role: 'COMD' },
    { username: 'ads@pngdf.mil.pg', role: 'ADS' }
  ];

  console.log('Seeding users...');
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        password: passwordHash,
        role: u.role
      },
      create: {
        username: u.username,
        password: passwordHash,
        role: u.role
      }
    });
  }
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
