import { Report } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { dayjs } from '../../common/dayjs';
import { prisma } from '../../common/primsa-client';
import { workdayHours } from '../[username]/[month]/[year]';
import { getWorkingDaysForMonth } from './common/month-days';

const countHours = (reports: Report[]) =>
	reports.reduce((prev, curr) => prev + curr.hours, 0);

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

		const { requestedUser } = JSON.parse(req.body);

		try {
			await prisma.$connect();

			const reports = await prisma.report.findMany({
				where: { username: { equals: requestedUser as string } },
				orderBy: { messageAt: 'asc' }
			});

			await prisma.$disconnect();

			const firstReportDay = dayjs(reports[0].messageAt);

			const startOfMonthOfFirstReport = firstReportDay.startOf('month');

			const allMonths = dayjs()
				.endOf('month')
				.add(1, 'day')
				.diff(startOfMonthOfFirstReport, 'months');

			let balance = [];

			for (let i = 0; i < allMonths; i++) {
				const startDate = startOfMonthOfFirstReport.add(i, 'months');

				const reportsForMonth = reports.filter((r) =>
					dayjs(r.messageAt).isSame(startDate, 'month')
				);

				const hoursToWork =
					getWorkingDaysForMonth(
						startDate.get('month').toString(),
						startDate.get('year').toString()
					).filter(
						(d) =>
							d.isBefore(dayjs().tz(process.env.TIMEZONE).startOf('day')) &&
							d.isAfter(firstReportDay.subtract(1, 'day').endOf('day'))
					).length * workdayHours;

				const workedHours = countHours(reportsForMonth);

				console.log(startDate.get('month').toString());
				console.log(workedHours, 'worked');
				console.log(hoursToWork, 'to work');
				console.log(workedHours - hoursToWork, 'balance');
				console.log();

				balance.push(workedHours - hoursToWork);
			}

			const finalBalance = balance.reduce((prev, curr) => prev + curr, 0);

			return res.json({
				balance: finalBalance
			});
		} catch (e) {
			console.log(e);

			return res.status(400).json({});
		}
	}
}
