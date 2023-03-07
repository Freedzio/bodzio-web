import { NextApiRequest, NextApiResponse } from 'next';
import { getTotalBalance } from './common/get-total-balance';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	console.log(req.headers);

	if (req.headers['x-bodzio-secret'] !== process.env.BODZIO_SECRET) {
		console.log('UNAUTHORIZED ACCESS');

		return res.status(403).send({});
	}

	if (req.method === 'POST') {
		console.log('INCOMING BODY');
		console.log(req.body);

		const { requestedUser } = JSON.parse(req.body);

		try {
			const finalBalance = await getTotalBalance(requestedUser);

			return res.json({
				balance: finalBalance
			});
		} catch (e) {
			console.log(e);

			return res.status(400).json({});
		}
	}
}
