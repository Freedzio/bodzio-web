import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { PrismaClient } from '@prisma/client';
import { dayjs } from '../../../../common/dayjs';
import { range } from 'lodash';

import Holidays from 'date-holidays';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dayjs } from 'dayjs';

type NiceReport = {
	username: string;
	created_at: string;
	job: string;
	hours: number;
	id: string;
	highlight: boolean;
	week: number;
	isHoliday: boolean;
};

type Report = {
	username: string;
	created_at: Date;
	job: string;
	hours: number;
	id: string;
};

type Props = {
	// offDays: string[];
	tableData: NiceReport[];
	username: string;
	month: string;
	year: string;
};

const mapReport = (report: Report) => ({
	...report,
	created_at: report.created_at.toString()
});

const workdayHours = 6;

const monthOptions = [
	{ value: '0', name: 'styczeń' },
	{ value: '1', name: 'luty' },
	{ value: '2', name: 'marzec' },
	{ value: '3', name: 'kwiecień' },
	{ value: '4', name: 'maj' },
	{ value: '5', name: 'czerwiec' },
	{ value: '6', name: 'lipiec' },
	{ value: '7', name: 'sierpień' },
	{ value: '8', name: 'wrzesień' },
	{ value: '9', name: 'październik' },
	{ value: '10', name: 'listopad' },
	{ value: '11', name: 'grudzień' }
];

export const getServerSideProps = async (
	context: NextPageContext
): Promise<{ props: Props }> => {
	const { username, month, year } = context.query;

	const prisma = new PrismaClient();

	const hd = new Holidays();
	hd.init('PL');
	const holidays = hd.getHolidays(parseInt(year as string));

	const startDate = dayjs()
		.set('month', parseInt(month as string))
		.set('year', parseInt(year as string))
		.startOf('month');

	const endDate = dayjs()
		.set('month', parseInt(month as string))
		.set('year', parseInt(year as string))
		.endOf('month');

	const daysRange = range(1, endDate.get('date') + 1);

	const isHolidayOrOff = (date: Dayjs) =>
		!!hd.isHoliday(date.toDate()) ||
		date.get('day') === 0 ||
		date.get('day') === 6;

	const isWorkingDay = (date: Dayjs) => !isHolidayOrOff(date);

	const workingDaysInMonth = daysRange
		.map((n) => startDate.set('date', n))
		.filter(isWorkingDay);

	const offDaysInMonth = daysRange
		.map((n) => startDate.set('date', n))
		.filter(isHolidayOrOff);

	await prisma.$connect();

	const reports = await prisma.report.findMany({
		where: {
			username: {
				equals: username as string
			},
			created_at: {
				gte: startDate.toISOString(),
				lte: endDate.toISOString()
			}
		}
	});

	await prisma.$disconnect();

	const workingDaysData = workingDaysInMonth
		.filter((v) => v.isBefore(dayjs()))
		.map((d) => ({
			[d.format()]: reports
				.filter((r) => dayjs(r.created_at).isSame(d, 'date'))
				.map(mapReport)
		}));

	const offDaysData = offDaysInMonth
		.map((d) => ({
			[d.format()]: reports
				.filter((r) => dayjs(r.created_at).isSame(d, 'date'))
				.map(mapReport)
		}))
		.filter((v) => Object.entries(v)[0][1].length > 0);

	const allWorkingData = workingDaysData
		.concat(offDaysData)
		.map((d, i) => {
			const [date, reports] = Object.entries(d)[0];

			const highlight = !!(i % 2);

			return reports.length > 0
				? reports.map((r) => ({
						...r,
						highlight,
						created_at: dayjs(r.created_at).format('DD-MM-YYYY'),
						week: dayjs(r.created_at).isoWeek(),
						isHoliday: isHolidayOrOff(dayjs(r.created_at))
				  }))
				: [
						{
							created_at: dayjs(date).format('DD-MM-YYYY'),
							username: username as string,
							job: '---BRAK---',
							hours: 0,
							highlight,
							week: dayjs(date).isoWeek(),
							id: '',
							isHoliday: false
						}
				  ];
		})
		.flat();

	return {
		props: {
			username: username as string,
			month: monthOptions.find((m) => m.value.toString() === month)
				?.name as string,
			year: year as string,
			tableData: allWorkingData
			// offDays: offDaysInMonth.map((d) => d.toString())
			// reports: reports.map((r) => ({
			// 	...r,
			// 	created_at: dayjs(r.created_at).format('DD-MM-YYYY')
			// }))
		}
	};
};

const headerTemplate = (report: NiceReport) => {
	return (
		<div>
			<span>Tydzień {report.week}</span>
		</div>
	);
};

const getUniqueDates = (reports: NiceReport[]) => [
	...new Set(reports.map((r) => r.created_at))
];

const countHours = (reports: NiceReport[]) =>
	reports.reduce((prev, curr) => prev + curr.hours, 0);

const MonthReport: NextPage<Props> = ({ tableData, month, year, username }) => {
	const footerTemplate = (report: NiceReport) => {
		const reportsForWeek = tableData.filter((d) => d.week === report.week);
		const workingDaysInWeek = getUniqueDates(
			reportsForWeek.filter((d) => !d.isHoliday)
		);

		return (
			<td colSpan={3}>
				<strong>
					W sumie {countHours(reportsForWeek)} na{' '}
					{workingDaysInWeek.length * workdayHours} godzin
				</strong>
			</td>
		);
	};
	return (
		<div className='px-8'>
			<h4>{`Raport ${username} za okres ${month} ${year}`}</h4>
			<DataTable
				resizableColumns
				rowGroupMode='subheader'
				groupRowsBy='week'
				rowGroupHeaderTemplate={headerTemplate}
				rowGroupFooterTemplate={footerTemplate}
				value={tableData}
				responsiveLayout='scroll'
				scrollable
				scrollHeight='80vh'
			>
				<Column field='created_at' header='Data' sortable />
				<Column field='job' header='Zakres' />
				<Column
					field='hours'
					header='Czas'
					body={(report) => report.hours + 'h'}
				/>
			</DataTable>
			<div className='py-5'>
				<div>
					<strong>Podsumowanie miesiąca:</strong>
				</div>
				<div>
					Godziny do przepracowania:{' '}
					{getUniqueDates(tableData.filter((r) => !r.isHoliday)).length *
						workdayHours}
				</div>
				<div>Godziny przepracowane: {countHours(tableData)}</div>
				<div>
					Bilans:{' '}
					{countHours(tableData) -
						getUniqueDates(tableData.filter((r) => !r.isHoliday)).length *
							workdayHours}
				</div>
			</div>
		</div>
	);
};

export default MonthReport;
