import { NextPage, NextPageContext } from 'next';
import React from 'react';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

type Props = { reports: any[] };

export const getServerSideProps = async (context: NextPageContext) => {
	const { username, month, year } = context.query;

	const prisma = new PrismaClient();

	await prisma.$connect();
	const reports = await prisma.report.findMany({
		where: {
			username: {
				equals: username as string
			},
			created_at: {
				gte: dayjs()
					.set('month', 9)
					.set('year', parseInt(year as string))
					.startOf('month')
					.toDate(),
				lte: dayjs()
					.set('month', 9)
					.set('year', parseInt(year as string))
					.endOf('month')
					.toDate()
			}
		}
	});

	await prisma.$disconnect();

	return {
		props: {
			reports: reports.map((r) => ({
				...r,
				created_at: r.created_at.toDateString()
			}))
		}
	};
};

const MonthReport: NextPage<Props> = ({ reports }) => {
	return <pre>{JSON.stringify(reports, null, 2)}</pre>;
};

export default MonthReport;
