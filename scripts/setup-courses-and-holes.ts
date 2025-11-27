import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://pocketbase-production-e678.up.railway.app';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function setupCoursesAndHoles() {
	const pb = new PocketBase(POCKETBASE_URL);

	console.log('⛳ FLI Golf - Setup Courses and Holes');
	console.log(`📡 Connecting to: ${POCKETBASE_URL}\n`);

	if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
		console.error('❌ Error: Admin credentials not found');
		process.exit(1);
	}

	try {
		await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
		console.log('✓ Authenticated\n');

		const collections = await pb.collections.getFullList();

		// Create courses collection
		console.log('📦 Creating courses collection...');
		let coursesCol = collections.find(c => c.name === 'courses');
		
		if (!coursesCol) {
			coursesCol = await pb.collections.create({
				name: 'courses',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(coursesCol.id, {
				schema: [
					{
						name: 'name',
						type: 'text',
						required: true,
						options: { min: 2, max: 100 }
					},
					{
						name: 'location',
						type: 'text',
						required: false,
						options: { max: 200 }
					},
					{
						name: 'description',
						type: 'text',
						required: false,
						options: { max: 500 }
					},
					{
						name: 'is_active',
						type: 'bool',
						required: true
					}
				]
			});
			console.log('✓ Created courses collection\n');
		} else {
			console.log('✓ Courses collection already exists\n');
		}

		// Create holes collection
		console.log('📦 Creating holes collection...');
		let holesCol = collections.find(c => c.name === 'holes');
		
		if (!holesCol) {
			const updatedCollections = await pb.collections.getFullList();
			coursesCol = updatedCollections.find(c => c.name === 'courses');

			holesCol = await pb.collections.create({
				name: 'holes',
				type: 'base',
				listRule: '@request.auth.id != ""',
				viewRule: '@request.auth.id != ""',
				createRule: null,
				updateRule: null,
				deleteRule: null
			});

			await pb.collections.update(holesCol.id, {
				schema: [
					{
						name: 'course',
						type: 'relation',
						required: true,
						options: {
							collectionId: coursesCol.id,
							cascadeDelete: true,
							maxSelect: 1
						}
					},
					{
						name: 'hole_number',
						type: 'number',
						required: true,
						options: { min: 1 }
					},
					{
						name: 'par',
						type: 'number',
						required: true,
						options: { min: 3, max: 3 }
					},
					{
						name: 'distance',
						type: 'number',
						required: true,
						options: { min: 1, max: 333 }
					}
				]
			});
			console.log('✓ Created holes collection\n');
		} else {
			console.log('✓ Holes collection already exists\n');
		}

		// Update tournaments to link to courses
		console.log('📦 Updating tournaments collection...');
		const tournamentsCol = collections.find(c => c.name === 'tournaments');
		
		if (tournamentsCol) {
			const updatedCollections = await pb.collections.getFullList();
			coursesCol = updatedCollections.find(c => c.name === 'courses');

			// Get current schema
			const currentSchema = tournamentsCol.schema || tournamentsCol.fields || [];
			
			// Check if course field already exists
			const hasCourseField = currentSchema.some((f: any) => f.name === 'course');
			
			if (!hasCourseField) {
				await pb.collections.update(tournamentsCol.id, {
					schema: [
						...currentSchema,
						{
							name: 'course',
							type: 'relation',
							required: false,
							options: {
								collectionId: coursesCol.id,
								cascadeDelete: false,
								maxSelect: 1
							}
						}
					]
				});
				console.log('✓ Added course field to tournaments\n');
			} else {
				console.log('✓ Tournaments already has course field\n');
			}
		}

		// Create test courses
		console.log('🏌️ Creating test courses...\n');

		// Course A
		const courseA = await pb.collection('courses').create({
			name: 'Test Course A',
			location: 'Test Location A',
			description: 'Test course with 4 holes for scoring tests',
			is_active: true
		});
		console.log('✓ Created Course A');

		// Create 4 holes for Course A
		const courseAHoles = [
			{ distance: 150, hole_number: 1 },
			{ distance: 200, hole_number: 2 },
			{ distance: 250, hole_number: 3 },
			{ distance: 300, hole_number: 4 }
		];

		for (const hole of courseAHoles) {
			await pb.collection('holes').create({
				course: courseA.id,
				hole_number: hole.hole_number,
				par: 3,
				distance: hole.distance
			});
			console.log(`  ✓ Hole ${hole.hole_number}: ${hole.distance}ft, Par 3`);
		}

		// Course B
		console.log();
		const courseB = await pb.collection('courses').create({
			name: 'Test Course B',
			location: 'Test Location B',
			description: 'Test course with 4 holes for scoring tests',
			is_active: true
		});
		console.log('✓ Created Course B');

		// Create 4 holes for Course B
		const courseBHoles = [
			{ distance: 175, hole_number: 1 },
			{ distance: 225, hole_number: 2 },
			{ distance: 275, hole_number: 3 },
			{ distance: 325, hole_number: 4 }
		];

		for (const hole of courseBHoles) {
			await pb.collection('holes').create({
				course: courseB.id,
				hole_number: hole.hole_number,
				par: 3,
				distance: hole.distance
			});
			console.log(`  ✓ Hole ${hole.hole_number}: ${hole.distance}ft, Par 3`);
		}

		console.log('\n✅ Setup complete!\n');

		// Verify
		console.log('📊 Verification:\n');
		const courses = await pb.collection('courses').getFullList();
		console.log(`Courses: ${courses.length}`);
		
		for (const course of courses) {
			const holes = await pb.collection('holes').getFullList({
				filter: `course = "${course.id}"`,
				sort: 'hole_number'
			});
			console.log(`  ${course.name}: ${holes.length} holes`);
			holes.forEach((h: any) => {
				console.log(`    Hole ${h.hole_number}: ${h.distance}ft, Par ${h.par}`);
			});
		}

		console.log('\n✅ Courses and holes ready for testing!\n');

	} catch (error: any) {
		console.error('\n❌ Error:', error.message);
		if (error.data) {
			console.error('Details:', JSON.stringify(error.data, null, 2));
		}
		process.exit(1);
	}
}

setupCoursesAndHoles();
