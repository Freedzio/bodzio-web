// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { NextApiRequest, NextApiResponse } from 'next';
import { dayjs } from '../../common/dayjs';
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

		const { duration, fromDate, username } = JSON.parse(req.body);

		try {
			await prisma.$connect();

			const hoursNumber = parseFloat(duration);

			const entryId = `${username}${fromDate}`;

			await prisma.dayDurations.upsert({
				where: { myId: entryId },
				create: {
					myId: entryId,
					username,
					duration: hoursNumber,
					fromDateString: fromDate,
					fromDate: dayjs(fromDate, 'DD.MM.YYYY').add(1, 'hour').toDate()
				},
				update: {
					duration: hoursNumber,
					fromDateString: fromDate,
					fromDate: dayjs(fromDate, 'DD.MM.YYYY').add(1, 'hour').toDate()
				}
			});

			await prisma.$disconnect();
			console.log('SUCCESS');
		} catch (e) {
			console.log(e);

			return res.status(400).json({});
		}
	}
	res.status(200).json({});
}
