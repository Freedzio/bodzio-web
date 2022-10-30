export default function Home() {
	const lennies = [
		'( ͡° ͜ʖ ͡°)',
		'( ͡° ͜ʖ ͡°)╭∩╮',
		'( ͠° ͟ʖ ͡°)',
		'(° ͜ʖ °)',
		'[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]',
		'(____  .  ____)',
		'( ͡°( ͡° ͜ʖ( ͡° ͜ʖ ͡°)ʖ ͡°) ͡°)',
		'(͡ ͡° ͜ つ ͡͡°)'
	];
	const lenny = lennies[Math.floor(Math.random() * lennies.length)];
	return (
		<div className='flex justify-content-center' style={{ fontSize: '150px' }}>
			{lenny}
		</div>
	);
}
