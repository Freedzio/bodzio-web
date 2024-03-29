import React, { useEffect, useState } from "react";
import { NextPage, NextPageContext } from "next";
import { dayjs } from "../../../../common/dayjs";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tooltip } from "primereact/tooltip";
import classNames from "classnames";
import { prisma } from "../../../../common/primsa-client";
import { imageExtensions } from "../../../../common/image-extensions";
import { videoExtensions } from "../../../../common/video-extensions";
import { Button } from "primereact/button";
import Link from "next/link";
import { InputSwitch } from "primereact/inputswitch";
import { DayDurations, Report } from "@prisma/client";
import {
	getHoursToWorkForDays,
	getOffDaysForMonth,
	getWorkingDaysForMonth,
	isHolidayOrOff,
} from "../../../api/common/month-days";
import { useSession, signIn, signOut } from "next-auth/react";
import { ProgressSpinner } from "primereact/progressspinner";
import { getTotalBalance } from "../../../api/common/get-total-balance";

const cookieName = "shouldShowAllDays";

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
	isSecret: boolean;
	isPto: boolean;
	attachments: any[];
	link: string;

	day: string;

	highlight: boolean;
	week: number;
	isHoliday: boolean;
};

type Props = {
	// offDays: string[];
	tableData: NiceReport[];
	username: string;
	month: string;
	year: string;
	firstReportDate: string;
	dayDurations: DayDurations[];
	totalBalance: number;
};

const mapReport = (report: Report) => ({
	...report,
	createdAt: report.createdAt.toString(),
	editedAt: report.lastEditAt.toString(),
});

const isImage = (url: string) =>
	imageExtensions.includes(url.split(".").pop() as string);

const isVideo = (url: string) =>
	videoExtensions.includes(url.split(".").pop() as string);

export const workdayHours = 6;

const monthOptions = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
];

export const getServerSideProps = async ({
	query,
}: NextPageContext): Promise<{ props: Props }> => {
	const { username, month, year } = query;

	const startDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set("month", parseInt(month as string))
		.set("year", parseInt(year as string))
		.startOf("month");

	const endDate = dayjs()
		.tz(process.env.TIMEZONE)
		.set("month", parseInt(month as string))
		.set("year", parseInt(year as string))
		.endOf("month");

	const workingDaysInMonth = getWorkingDaysForMonth(
		month as string,
		year as string
	);

	const offDaysInMonth = getOffDaysForMonth(month as string, year as string);

	await prisma.$connect();

	const reports = await prisma.report.findMany({
		where: {
			username: {
				equals: username as string,
			},
			messageAt: {
				gte: startDate.toISOString(),
				lte: endDate.toISOString(),
			},
		},
	});

	const dayDurations = await prisma.dayDurations.findMany({
		where: { username: { equals: username as string } },
		orderBy: { fromDate: "desc" },
	});

	const niceDurations = (await dayDurations).map((dd) => ({
		...dd,
		fromDate: dayjs(dd.fromDate).toISOString(),
	}));

	const firstReport = await prisma.report.findMany({
		where: {
			username: {
				equals: username as string,
			},
		},
		orderBy: {
			messageAt: "asc",
		},
		take: 1,
	});

	await prisma.$disconnect();

	const firstReportDate = dayjs(firstReport[0]?.messageAt).format();

	const workingDaysData = workingDaysInMonth.map((d) => ({
		[d.format()]: reports
			.filter((r) =>
				dayjs(r.messageAt).tz(process.env.TIMEZONE).isSame(d, "date")
			)
			.map(mapReport),
	}));

	const offDaysData = offDaysInMonth
		.map((d) => ({
			[d.format()]: reports
				.filter((r) =>
					dayjs(r.messageAt).tz(process.env.TIMEZONE).isSame(d, "date")
				)
				.map(mapReport),
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
						createdAt: dayjs(r.createdAt).tz(process.env.TIMEZONE).format(),
						lastUpdateAt: dayjs(r.lastUpdateAt)
							.tz(process.env.TIMEZONE)
							.format(),
						lastEditAt: dayjs(r.lastEditAt).tz(process.env.TIMEZONE).format(),
						messageAt: dayjs(r.messageAt).tz(process.env.TIMEZONE).format(),
						week: dayjs(r.messageAt).tz(process.env.TIMEZONE).week(),
						isHoliday: isHolidayOrOff(
							dayjs(r.messageAt).tz(process.env.TIMEZONE)
						),
						day: dayjs(r.messageAt)
							.tz(process.env.TIMEZONE)
							.format("DD.MM.YYYY"),
				  }))
				: [
						{
							createdAt: dayjs(date).tz(process.env.TIMEZONE).format(),
							lastUpdateAt: dayjs(date).tz(process.env.TIMEZONE).format(),
							lastEditAt: dayjs(date).tz(process.env.TIMEZONE).format(),
							messageAt: dayjs(date).tz(process.env.TIMEZONE).format(),
							messageId: "",
							username: username as string,
							reporter: username as string,
							job: "---BRAK---",
							hours: 0,
							highlight,
							week: dayjs(date).tz(process.env.TIMEZONE).week(),
							id: "",
							isHoliday: false,
							day: dayjs(date).tz(process.env.TIMEZONE).format("DD.MM.YYYY"),
							attachments: [],
							link: "",
							isSecret: false,
							isPto: false,
						},
				  ];
		})
		.flat();

	const totalBalance = await getTotalBalance(username as string);

	return {
		props: {
			totalBalance,
			dayDurations: niceDurations as any,
			username: username as string,
			month: month as string,
			year: year as string,
			tableData: allWorkingData,
			firstReportDate: firstReportDate,
		},
	};
};

const getUniqueDates = (reports: NiceReport[]) => [
	...new Set(reports.map((r) => r.day)),
];

const countHours = (reports: NiceReport[]) =>
	parseFloat(reports.reduce((prev, curr) => prev + curr.hours, 0).toFixed(2));

const rowClass = (report: NiceReport) => {
	return {
		"bg-blue-100 ": report.isHoliday,
		"bg-yellow-100 ": report.isPto,
	};
};

const weekDays = [
	// '',
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

const dateBodyTemplate = (report: NiceReport) => {
	const date = dayjs(report.messageAt).tz(process.env.TIMEZONE);
	return `${weekDays[date.day()]}, ${date.format("DD MMM")}`;
};

const jobBodyTemplate = (report: NiceReport) => {
	if (report.job === "---NONE---") {
		return report.job;
	}

	if (report.isSecret) {
		return "CEO'd";
	}

	const linkTagTemplate = (match: string) => {
		return `<a class="text-blue-500" target="_blank" href="${
			process.env.NEXT_PUBLIC_MIRO_LINK_TEMPLATE
		}${match.replace("#", "")}">${match}</a>`;
	};

	const lines = report.job
		.replaceAll(/\* */g, "*")
		.replaceAll(/\- */g, "-")
		.replaceAll(/\B#[0-9]+\b/g, linkTagTemplate);

	return (
		<pre
			style={{ whiteSpace: "pre-wrap" }}
			dangerouslySetInnerHTML={{ __html: lines }}></pre>
	);
};

const attachmentsBodyTemplate = (report: NiceReport) => {
	return (
		<div className='flex flex-wrap gap-1'>
			{report.attachments.map((a) =>
				isImage(a.url) ? (
					<a
						href={a.url}
						target='_blank'
						rel='noreferrer'
						key={a.url}>
						<img
							src={a.url}
							style={{ maxWidth: "200px", maxHeight: "200px" }}
						/>
					</a>
				) : isVideo(a.url) ? (
					<video
						style={{ maxWidth: "200px", maxHeight: "200px" }}
						controls
						key={a.url}>
						<source src={a.url} />
					</video>
				) : (
					<a
						href={a.url}
						className='text-blue-500 w-full'
						key={a.url}>
						{a.name}
					</a>
				)
			)}
		</div>
	);
};

const discordLinkBodyTemplate = (report: NiceReport) => {
	return !!report.link ? (
		<a
			href={report.link}
			className='text-blue-500'>
			DISCORD
		</a>
	) : null;
};

const MonthReport: NextPage<Props> = ({
	tableData,
	month,
	year,
	username,
	firstReportDate,
	dayDurations,
	totalBalance,
}) => {
	const [showAll, setShowAll] = useState(false);
	const { data: session, status } = useSession();

	const minimalAllowedDate = dayjs(firstReportDate)
		.subtract(1, "day")
		.endOf("day");

	const headerTemplate = (report: NiceReport) => {
		const firstDay = tableData.find((r) => r.week === report.week)?.messageAt;
		const lastDay = tableData
			.filter((r) => r.week === report.week)
			.pop()?.messageAt;

		const weekNumber = report.week - tableData[0].week + 1;

		const tooltip = `${dayjs(firstDay)
			.tz(process.env.TIMEZONE)
			.format("DD.MM.YYYY")} - ${dayjs(lastDay)
			.tz(process.env.TIMEZONE)
			.format("DD.MM.YYYY")}`;

		return (
			<>
				<Tooltip
					target='.header'
					mouseTrack
					mouseTrackLeft={10}
				/>
				<div
					className='header'
					style={{ width: "80vw" }}
					data-pr-tooltip={tooltip}>
					<strong>Tydzień {weekNumber}</strong>
				</div>
			</>
		);
	};

	const footerTemplate = (report: NiceReport) => {
		const reportsForWeek = finalData.filter((d) => d.week === report.week);
		const workingDaysInWeek = getUniqueDates(
			reportsForWeek.filter(
				(d) => !d.isHoliday && dayjs(d.messageAt).isAfter(minimalAllowedDate)
			)
		).map((x) => dayjs(x, "DD.MM.YYYY"));

		const workedHours = countHours(reportsForWeek);
		const hoursToWork = getHoursToWorkForDays(workingDaysInWeek, dayDurations);

		return (
			<td colSpan={3}>
				<span>
					In total -{" "}
					<strong>
						{workedHours} \ {hoursToWork}
					</strong>{" "}
					hours
					<strong>
						<span
							className={classNames({
								"text-red-600": workedHours < hoursToWork,
								"text-green-600": workedHours > hoursToWork,
							})}>
							{(workedHours - hoursToWork).toString().replace("-", "−")}
						</span>
					</strong>
				</span>
			</td>
		);
	};

	const finalData = tableData.filter(
		(r) => showAll || !dayjs(r.messageAt).isAfter(dayjs().endOf("day"))
	);

	const workedHours = countHours(tableData);
	const hoursToWork = getHoursToWorkForDays(
		getUniqueDates(
			finalData.filter(
				(r) =>
					!r.isHoliday &&
					// dayjs(r.messageAt).isBefore(dayjs().startOf('day')) &&
					dayjs(r.messageAt).isAfter(minimalAllowedDate)
			)
		).map((x) => dayjs(x, "DD.MM.YYYY")),
		dayDurations
	);

	const getPrevMonthLink = () => {
		const newDate = dayjs()
			.set("month", parseInt(month))
			.set("year", parseInt(year))
			.subtract(1, "month");

		return `/${username}/${newDate.get("month")}/${newDate.get("year")}`;
	};

	const getNextMonthLink = () => {
		const newDate = dayjs()
			.set("month", parseInt(month))
			.set("year", parseInt(year))
			.add(1, "month");

		return `/${username}/${newDate.get("month")}/${newDate.get("year")}`;
	};

	const onToggle = () => {
		setShowAll(!showAll);
		localStorage.setItem(cookieName, !showAll ? "1" : "0");
	};

	useEffect(() => {
		setShowAll(!!parseInt(localStorage.getItem(cookieName) as string));
	}, []);

	useEffect(() => {
		if (status === "unauthenticated") {
			signIn();
		}
	}, [status]);

	const canEnter =
		session?.user?.email?.endsWith(
			process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN as string
		) || session?.user?.email === process.env.NEXT_PUBLIC_DEV_EMAIL;

	if (!!session && !canEnter) {
		return (
			<div
				className='flex flex-column justify-content-center align-items-center'
				style={{ height: "100vh" }}>
				<h3>Well well well, it seems I cannot let you in...</h3>
				<Button onClick={() => signOut()}>Sign out</Button>
				<br />
				<h4>Here, have a puppy</h4>
				<img
					src='https://www.dierapotheker.be/media/image/95/37/34/pup-gezondheidscontrole-2.png'
					style={{ maxWidth: "300px" }}
				/>
			</div>
		);
	}

	if (status === "loading") {
		return (
			<div
				className='flex flex-column justify-content-center align-items-center'
				style={{ height: "80vh" }}>
				<h3>Loading...</h3>
				<ProgressSpinner
					style={{ width: "100px", height: "100px" }}
					strokeWidth='8'
				/>
			</div>
		);
	}

	if (status !== "authenticated") {
		return null;
	}

	return (
		<div className='px-8 pb-8'>
			<div
				className='pt-5'
				style={{ fontSize: "26px" }}>
				<strong>{username}</strong>
				{"'"}s report for{" "}
				<strong>
					{monthOptions[parseInt(month)]} {year}
				</strong>
			</div>
			<div className='gap-2 flex align-items-center mt-3 noprint'>
				<Link href={getPrevMonthLink()}>
					<Button className='p-button-info p-button-outlined'>
						<i
							className='pi pi-chevron-left'
							style={{ fontSize: "1rem" }}></i>
						{/* Poprzedni miesiąc */}
					</Button>
				</Link>
				<Link href={getNextMonthLink()}>
					<Button className='p-button-info p-button-outlined'>
						{/* Następny miesiąc */}
						<i
							className='pi pi-chevron-right'
							style={{ fontSize: "1rem" }}></i>
					</Button>
				</Link>
				<InputSwitch
					color='red'
					checked={showAll}
					onChange={onToggle}
				/>
				<span>Show future days</span>
			</div>
			<div className='my-5 p-2 highlight'>
				<div>
					<strong>Month summary</strong>
				</div>
				<div>Hours to work: {hoursToWork}</div>
				<div>Hours worked: {workedHours}</div>
				<div
					className={classNames({
						"text-red-600": workedHours < hoursToWork,
						"text-green-600": workedHours > hoursToWork,
					})}>
					<strong>Monthly balance: {workedHours - hoursToWork}</strong>
				</div>
				<div
					className={classNames({
						"text-red-600": totalBalance < 0,
						"text-green-600": totalBalance > 0,
					})}>
					<strong>Total balace: {totalBalance}</strong>
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
				value={finalData}
				responsiveLayout='scroll'
				scrollable
				tableStyle={{ tableLayout: "auto" }}>
				<Column
					field='messageAt'
					header='Date'
					body={dateBodyTemplate}
					sortable
				/>
				<Column
					field='job'
					body={jobBodyTemplate}
					header='Job'
				/>
				<Column
					field='hours'
					header='Time'
					body={(report: NiceReport) =>
						report.hours + "h" + (report.isPto ? " URLOP" : "")
					}
				/>
				<Column
					field='job'
					body={attachmentsBodyTemplate}
					header='Attachments'
				/>
				<Column
					className='noprint'
					field='link'
					body={discordLinkBodyTemplate}
				/>
				{/* <Column field='miroIds' body={miroIdsBodyTemplate} /> */}
			</DataTable>
		</div>
	);
};

export default MonthReport;
