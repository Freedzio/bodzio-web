import { Report } from '@prisma/client';
import { dayjs } from '../../../common/dayjs';
import { prisma } from '../../../common/primsa-client';
import { getHoursToWorkForDays, getWorkingDaysForMonth } from './month-days';

const countHours = (reports: Report[]) =>
	reports.reduce((prev, curr) => prev + curr.hours, 0);

export const getTotalBalance = async (username: string) => {
	await prisma.$connect();

	const reports = await prisma.report.findMany({
		where: { username: { equals: username as string } },
		orderBy: { messageAt: 'asc' }
	});

	const dayDurations = await prisma.dayDurations.findMany({
		where: { username: { equals: username as string } },
		orderBy: { fromDate: 'desc' }
	});

	await prisma.$disconnect();

	const firstReportDay = dayjs(reports[0]?.messageAt);

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

		const hoursToWork = getHoursToWorkForDays(
			getWorkingDaysForMonth(
				startDate.get('month').toString(),
				startDate.get('year').toString()
			).filter(
				(d) =>
					d.isBefore(
						dayjs().tz(process.env.TIMEZONE).add(1, 'days').startOf('day')
					) && d.isAfter(firstReportDay.subtract(1, 'day'))
			),
			dayDurations
		);

		const workedHours = countHours(reportsForMonth);

		balance.push(workedHours - hoursToWork);
	}

	return balance.reduce((prev, curr) => prev + curr, 0);
};
