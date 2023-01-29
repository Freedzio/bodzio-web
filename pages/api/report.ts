// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import dayjs from 'dayjs';
import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../common/primsa-client';

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

		const {
			username,
			reporter,
			job,
			hours,
			lastEditAt,
			messageId,
			messageAt,
			attachments,
			link
		} = JSON.parse(req.body);

		try {
			await prisma.$connect();

			const hoursNumber = parseFloat(hours);

			const backupId = uuid();

			await prisma.report.upsert({
				where: { messageId: messageId ?? backupId },
				create: {
					username,
					reporter,
					job,
					hours: hoursNumber,
					messageAt: dayjs(messageAt).toDate(),
					messageId: messageId ?? backupId,
					attachments,
					link
				},
				update: {
					reporter,
					job,
					hours: hoursNumber,
					lastEditAt: dayjs(lastEditAt ?? dayjs()).toDate(),
					lastUpdateAt: dayjs().toDate(),
					attachments,
					link
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
