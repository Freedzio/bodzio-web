import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { PrismaClient } from '@prisma/client';
import { dayjs } from '../../../../common/dayjs';
import { range } from 'lodash';

import Holidays from 'date-holidays';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tooltip } from 'primereact/tooltip';
import { Dayjs } from 'dayjs';
import classNames from 'classnames';

type NiceReport = {
	username: string;
	reporter: string;
	job: string;
	hours: number;
	createdAt: string;
	lastEditAt: string;
	lastUpdateAt: string;
	messageAt: string;
	messageId: string;
	id: string;

	day: string;

	highlight: boolean;
	week: number;
	isHoliday: boolean;
};

type Report = {
	username: string;
	reporter: string;
	job: string;
	hours: number;
	createdAt: Date;
	lastUpdateAt: Date;
	messageAt: Date;
	lastEditAt: Date;
	messageId: string;
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
	createdAt: report.createdAt.toString(),
	editedAt: report.lastEditAt.toString()
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
			messageAt: {
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
				.filter((r) => dayjs(r.createdAt).isSame(d, 'date'))
				.map(mapReport)
		}));

	const offDaysData = offDaysInMonth
		.map((d) => ({
			[d.format()]: reports
				.filter((r) => dayjs(r.createdAt).isSame(d, 'date'))
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
						createdAt: dayjs(r.createdAt).format(),
						lastUpdateAt: dayjs(r.lastUpdateAt).format(),
						lastEditAt: dayjs(r.lastEditAt).format(),
						messageAt: dayjs(r.messageAt).format(),
						week: dayjs(r.messageAt).isoWeek(),
						isHoliday: isHolidayOrOff(dayjs(r.createdAt)),
						day: dayjs(r.messageAt).format('DD.MM.YYYY')
				  }))
				: [
						{
							createdAt: dayjs(date).format(),
							lastUpdateAt: dayjs(date).format(),
							lastEditAt: dayjs(date).format(),
							messageAt: dayjs(date).format(),
							messageId: '',
							username: username as string,
							reporter: username as string,
							job: '---BRAK---',
							hours: 0,
							highlight,
							week: dayjs(date).isoWeek(),
							id: '',
							isHoliday: false,
							day: dayjs(date).format('DD.MM.YYYY')
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
			// 	createdAt: dayjs(r.createdAt).format('DD.MM.YYYY')
			// }))
		}
	};
};

const getUniqueDates = (reports: NiceReport[]) => [
	...new Set(reports.map((r) => r.day))
];

const countHours = (reports: NiceReport[]) =>
	reports.reduce((prev, curr) => prev + curr.hours, 0);

const rowClass = (report: NiceReport) => {
	return {
		'bg-blue-100 ': report.isHoliday
	};
};

const weekDays = [
	'',
	'Poniedziałek',
	'Wtorek',
	'Środa',
	'Czwartek',
	'Piątek',
	'Sobota',
	'Niedziela'
];

const dateBodyTemplate = (report: NiceReport) => {
	const date = dayjs(report.messageAt);
	return `${weekDays[date.isoWeekday()]}, ${date.format('DD MMM')}`;
};

const jobBodyTemplate = (report: NiceReport) => {
	if (report.job === '---BRAK---') {
		return report.job;
	}

	const lines = report.job.replaceAll(/\* */g, '*').replaceAll(/\- */g, '-');
	return (
		<div>
			<pre>{lines}</pre>
		</div>
	);
};

const MonthReport: NextPage<Props> = ({ tableData, month, year, username }) => {
	const headerTemplate = (report: NiceReport) => {
		const firstDay = tableData.find((r) => r.week === report.week)?.messageAt;
		const lastDay = tableData
			.filter((r) => r.week === report.week)
			.pop()?.messageAt;

		const weekNumber = report.week - tableData[0].week + 1;

		const tooltip = `${firstDay} - ${lastDay}`;

		return (
			<>
				<Tooltip target='.header' mouseTrack mouseTrackLeft={10} />
				<div
					className='header'
					style={{ width: '80vw' }}
					data-pr-tooltip={tooltip}
				>
					<strong>Tydzień {weekNumber}</strong>
				</div>
			</>
		);
	};

	const footerTemplate = (report: NiceReport) => {
		const reportsForWeek = tableData.filter((d) => d.week === report.week);
		const workingDaysInWeek = getUniqueDates(
			reportsForWeek.filter((d) => !d.isHoliday)
		);

		const workedHours = countHours(reportsForWeek);
		const hoursToWork = workingDaysInWeek.length * workdayHours;

		return (
			<td colSpan={3}>
				<span>
					W sumie <strong>{workedHours}</strong> na{' '}
					<strong>{hoursToWork}</strong> godzin - bilans{' '}
					<strong>
						<span
							className={classNames({
								'text-red-600': workedHours < hoursToWork,
								'text-green-600': workedHours > hoursToWork
							})}
						>
							{(workedHours - hoursToWork).toString().replace('-', '−')}
						</span>
					</strong>
				</span>
			</td>
		);
	};

	const workedHours = countHours(tableData);
	const hoursToWork =
		getUniqueDates(tableData.filter((r) => !r.isHoliday)).length * workdayHours;

	return (
		<div className='px-8 pb-8'>
			<div className='pt-5' style={{ fontSize: '26px' }}>
				Raport <strong>{username}</strong> za okres{' '}
				<strong>
					{month} {year}
				</strong>
			</div>
			<div className='my-5 p-2 highlight'>
				<div>
					<strong>Podsumowanie miesiąca</strong>
				</div>
				<div>Godziny do przepracowania: {hoursToWork}</div>
				<div>Godziny przepracowane: {workedHours}</div>
				<div
					className={classNames({
						'text-red-600': workedHours < hoursToWork,
						'text-green-600': workedHours > hoursToWork
					})}
				>
					<strong>Bilans: {workedHours - hoursToWork}</strong>
				</div>
			</div>
			<DataTable
				resizableColumns
				rowGroupMode='subheader'
				groupRowsBy='week'
				sortField='messageAt'
				rowClassName={rowClass}
				sortOrder={1}
				rowGroupHeaderTemplate={headerTemplate}
				rowGroupFooterTemplate={footerTemplate}
				value={tableData}
				responsiveLayout='scroll'
				scrollable
			>
				<Column
					field='messageAt'
					header='Data'
					body={dateBodyTemplate}
					sortable
				/>
				<Column field='job' body={jobBodyTemplate} header='Zakres' />
				<Column
					field='hours'
					header='Czas'
					body={(report) => report.hours + 'h'}
				/>
			</DataTable>
		</div>
	);
};

export default MonthReport;
