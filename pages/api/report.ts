// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.headers['x-bodzio-secret'] !== process.env.BODZIO_SECRET) {
		res.status(403).send({});
	}

	if (req.method === 'POST') {
		const { username, job, hours, messageId } = JSON.parse(req.body);
		const prisma = new PrismaClient();

		await prisma.$connect();
		await prisma.report.create({
			data: {
				username,
				job,
				hours: parseFloat(hours),
				messageId: messageId ?? uuid()
			}
		});

		await prisma.$disconnect();
	}
	res.status(200).json({});
}
