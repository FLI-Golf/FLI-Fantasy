<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, pb } from '$lib/pocketbase';
	import Users from '@lucide/svelte/icons/users';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Calendar from '@lucide/svelte/icons/calendar';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import Settings from '@lucide/svelte/icons/settings';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import FileText from '@lucide/svelte/icons/file-text';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	console.log('🚀 Admin page script loaded');

	let stats = $state({
		totalUsers: 0,
		totalSeasons: 0,
		totalTournaments: 0,
		activeGolfers: 0
	});

	let loading = $state(true);
	let checkingAuth = $state(true);
	
	console.log('📝 Initial state set');

	onMount(async () => {
		console.log('🔍 Admin page mounted');
		console.log('📊 Current user from store:', $currentUser);
		console.log('🔐 Auth store valid:', pb.authStore.isValid);
		console.log('🔑 Auth store token exists:', !!pb.authStore.token);
		
		// Debug alert to confirm mount
		if (typeof window !== 'undefined') {
			console.log('🪟 Window object exists');
			console.log('🌐 Location:', window.location.href);
		}
		
		// Wait a moment for auth to load from cookie
		console.log('⏳ Waiting 100ms for auth to load...');
		await new Promise(resolve => setTimeout(resolve, 100));
		
		console.log('📊 Current user after wait:', $currentUser);
		console.log('🔐 Auth store valid after wait:', pb.authStore.isValid);
		
		// Check if user is logged in
		if (!$currentUser) {
			console.log('❌ No current user, redirecting to home');
			goto('/');
			return;
		}
		
		if (!pb.authStore.isValid) {
			console.log('❌ Auth store invalid, redirecting to home');
			goto('/');
			return;
		}

		console.log('✅ User is logged in:', $currentUser.email);
		console.log('🆔 User ID:', $currentUser.id);

		// Fetch fresh user data to get the role field
		try {
			console.log('📡 Fetching fresh user data...');
			const freshUser = await pb.collection('users').getOne($currentUser.id);
			console.log('✅ Fresh user data received:', {
				id: freshUser.id,
				name: freshUser.name,
				email: freshUser.email,
				role: freshUser.role
			});
			
			if (freshUser.role !== 'admin') {
				console.log('❌ User is not admin, role:', freshUser.role);
				console.log('🔄 Redirecting to home...');
				goto('/');
				return;
			}

			console.log('✅ User is admin:', freshUser.name);
			console.log('🎉 Proceeding to load dashboard...');
			checkingAuth = false;
		} catch (err) {
			console.error('❌ Error fetching user:', err);
			goto('/');
			return;
		}

		// Load dashboard stats
		try {
			console.log('📊 Loading dashboard stats...');
			const [users, seasons, tournaments, golfers] = await Promise.all([
				pb.collection('users').getList(1, 1),
				pb.collection('fantasy_seasons').getList(1, 1),
				pb.collection('tournaments').getList(1, 1),
				pb.collection('golfers').getList(1, 1, { filter: 'is_active = true' })
			]);

			stats.totalUsers = users.totalItems;
			stats.totalSeasons = seasons.totalItems;
			stats.totalTournaments = tournaments.totalItems;
			stats.activeGolfers = golfers.totalItems;
			
			console.log('✅ Dashboard stats loaded:', stats);
		} catch (err) {
			console.error('❌ Error loading stats:', err);
		} finally {
			loading = false;
			console.log('✅ Dashboard ready!');
		}
	});
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
		<p class="text-gray-300">Welcome back, {$currentUser?.name || 'Admin'}!</p>
	</div>

	{#if checkingAuth || loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">
				{checkingAuth ? 'Checking authentication...' : 'Loading dashboard...'}
			</div>
		</div>
	{:else}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-xl p-6 shadow-lg">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-blue-100 rounded-lg">
						<Users class="h-6 w-6 text-blue-600" />
					</div>
					<span class="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
				</div>
				<h3 class="text-gray-600 font-medium">Total Users</h3>
			</div>

			<div class="bg-white rounded-xl p-6 shadow-lg">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-green-100 rounded-lg">
						<Trophy class="h-6 w-6 text-green-600" />
					</div>
					<span class="text-3xl font-bold text-gray-900">{stats.totalSeasons}</span>
				</div>
				<h3 class="text-gray-600 font-medium">Fantasy Seasons</h3>
			</div>

			<div class="bg-white rounded-xl p-6 shadow-lg">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-purple-100 rounded-lg">
						<Calendar class="h-6 w-6 text-purple-600" />
					</div>
					<span class="text-3xl font-bold text-gray-900">{stats.totalTournaments}</span>
				</div>
				<h3 class="text-gray-600 font-medium">Tournaments</h3>
			</div>

			<div class="bg-white rounded-xl p-6 shadow-lg">
				<div class="flex items-center justify-between mb-4">
					<div class="p-3 bg-orange-100 rounded-lg">
						<TrendingUp class="h-6 w-6 text-orange-600" />
					</div>
					<span class="text-3xl font-bold text-gray-900">{stats.activeGolfers}</span>
				</div>
				<h3 class="text-gray-600 font-medium">Active Golfers</h3>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="mb-8">
			<h2 class="text-2xl font-bold text-white mb-4">Quick Actions</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<a
					href="/admin/users"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
							<UserCog class="h-6 w-6 text-blue-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Users</h3>
							<p class="text-sm text-gray-600">View and edit user accounts</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/seasons"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
							<Trophy class="h-6 w-6 text-green-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Seasons</h3>
							<p class="text-sm text-gray-600">Create and edit fantasy seasons</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/tournaments"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
							<Calendar class="h-6 w-6 text-purple-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Tournaments</h3>
							<p class="text-sm text-gray-600">Create and edit tournaments</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/golfers"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
							<Users class="h-6 w-6 text-orange-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Golfers</h3>
							<p class="text-sm text-gray-600">Add and edit golfer profiles</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/courses"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
							<Calendar class="h-6 w-6 text-teal-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Courses</h3>
							<p class="text-sm text-gray-600">Create courses with 9 holes</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/groups"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
							<Users class="h-6 w-6 text-yellow-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Groups</h3>
							<p class="text-sm text-gray-600">Organize teams into groups</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/scores"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
							<BarChart class="h-6 w-6 text-red-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Manage Scores</h3>
							<p class="text-sm text-gray-600">Update golfer scores</p>
						</div>
					</div>
				</a>

				<a
					href="/admin/reports"
					class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
				>
					<div class="flex items-center gap-4">
						<div class="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
							<FileText class="h-6 w-6 text-indigo-600" />
						</div>
						<div>
							<h3 class="font-bold text-gray-900">Reports</h3>
							<p class="text-sm text-gray-600">View analytics and reports</p>
						</div>
					</div>
				</a>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="bg-white rounded-xl p-6 shadow-lg">
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>
			<div class="space-y-4">
				<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
					<div class="p-2 bg-blue-100 rounded-lg">
						<Users class="h-5 w-5 text-blue-600" />
					</div>
					<div class="flex-1">
						<p class="font-medium text-gray-900">New user registered</p>
						<p class="text-sm text-gray-600">2 hours ago</p>
					</div>
				</div>

				<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
					<div class="p-2 bg-green-100 rounded-lg">
						<Trophy class="h-5 w-5 text-green-600" />
					</div>
					<div class="flex-1">
						<p class="font-medium text-gray-900">Season created</p>
						<p class="text-sm text-gray-600">5 hours ago</p>
					</div>
				</div>

				<div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
					<div class="p-2 bg-purple-100 rounded-lg">
						<Calendar class="h-5 w-5 text-purple-600" />
					</div>
					<div class="flex-1">
						<p class="font-medium text-gray-900">Tournament updated</p>
						<p class="text-sm text-gray-600">1 day ago</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
