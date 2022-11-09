// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.headers['x-bodzio-secret'] !== process.env.BODZIO_SECRET) {
		console.log('UNAUTHORIZED ACCESS');

		return res.status(403).send({});
	}

	if (req.method === 'POST') {
		console.log('INCOMING BODY');
		console.log(req.body);

		const { username, reporter, job, hours, lastEditAt, messageId, messageAt } =
			JSON.parse(req.body);
		const prisma = new PrismaClient();

		try {
			await prisma.$connect();

			const hoursNumber = parseFloat(hours);

			const backupId = uuid();

			// console.log(dayjs(messageAt).toDate());
			// console.log(dayjs(messageAt).tz('Europe/Warsaw').toDate());

			await prisma.report.upsert({
				where: { messageId: messageId ?? backupId },
				create: {
					username,
					reporter,
					job,
					hours: hoursNumber,
					messageAt: dayjs(messageAt).toDate(),
					messageId: messageId ?? backupId
				},
				update: {
					reporter,
					job,
					hours: hoursNumber,
					lastEditAt: dayjs(lastEditAt ?? dayjs()).toDate(),
					lastUpdateAt: dayjs().toDate()
				}
			});

			await prisma.$disconnect();
		} catch (e) {
			console.log(e);

			return res.status(400).json({});
		}
	}
	res.status(200).json({});
}
