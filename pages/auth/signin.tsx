import { NextPageContext } from 'next';
import { Provider } from 'next-auth/providers';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from 'primereact/button';

export async function getServerSideProps(context: NextPageContext) {
	const providers = await getProviders();
	return {
		props: { providers }
	};
}

export default function SignIn(props: any) {
	const { providers } = props;
	const router = useRouter();
	const {
		query: { callbackUrl }
	} = router;

	return (
		<div
			className='flex flex-column gap-2 justify-content-start align-items-center'
			style={{ height: '100vh' }}
		>
			<img src='/bodzio.jpg' className='border-circle mt-2' />
			{Object.values(providers as Provider[]).map((provider: Provider) => (
				<div key={provider.name}>
					<Button
						onClick={() =>
							signIn(provider.id, {
								callbackUrl: callbackUrl as string
							})
						}
					>
						Zaloguj się
					</Button>
				</div>
			))}
		</div>
	);
}
