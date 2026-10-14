<script lang="ts">
	import { env } from "$env/dynamic/public";
	import SocialMeta from "$lib/components/SocialMeta.svelte";

	// Contact: an email if one is configured, otherwise the project's GitHub issues
	const contactEmail = env.PUBLIC_CONTACT_EMAIL;
	const issuesUrl = env.PUBLIC_SOURCE_URL
		? `${env.PUBLIC_SOURCE_URL.replace(/\/$/, "")}/issues`
		: null;
	const updated = "14 October 2026";
</script>

<SocialMeta
	title="Privacy"
	description="What Hear Me Out stores about you, where, why, and how to get it deleted."
/>

<article class="privacy">
	<h1>Privacy</h1>
	<p class="muted">Last updated {updated}</p>

	<p class="lead">
		Hear Me Out is a small hobby project. It stores as little as possible: only
		what it needs to let you log in and to show the tier lists you make. No ads,
		no tracking, no selling of data.
	</p>

	<h2>What we store</h2>
	<ul>
		<li>
			<strong>Your account:</strong> your email address, your username and your password.
			The password is stored only as a secure hash, so nobody can read it, us included.
		</li>
		<li>
			<strong>If you log in with Google or Discord:</strong> instead of a password,
			we get your email address, your name and profile picture link, and an ID for
			your account there. We only use the email to log you in and the name to suggest
			a username. We never get your Google or Discord password, and we can’t see or
			post anything in those accounts.
		</li>
		<li>
			<strong>What you make:</strong> your templates (titles, descriptions, item names
			and pictures you upload) and your tier lists, including who can see them.
		</li>
		<li>
			<strong>Login cookies:</strong> a few cookies that keep you logged in. They’re
			needed for the site to work, so there’s no cookie banner. There are no analytics
			or advertising cookies.
		</li>
		<li>
			<strong>Technical logs:</strong> like any website, our hosting providers briefly
			keep request logs (such as IP addresses) to run and protect the service.
		</li>
	</ul>

	<h2>Who can see what</h2>
	<ul>
		<li>
			Your <strong>username</strong> is shown on the templates and tier lists you
			make.
		</li>
		<li>
			<strong>Public</strong> templates and tier lists can be seen by anyone.
			<strong>Link-only</strong>
			ones by anyone who has the link. <strong>Private</strong> tier lists only by
			you.
		</li>
		<li>Your <strong>email address</strong> is never shown to other users.</li>
		<li>
			The combined “verdict” only uses public and link-only rankings, never
			private ones.
		</li>
	</ul>

	<h2>Where it’s stored</h2>
	<ul>
		<li>
			<strong>Supabase</strong> stores the database, logins and pictures in Frankfurt,
			Germany (EU).
		</li>
		<li>
			<strong>Vercel</strong> hosts the website and runs it in Frankfurt. Vercel is
			a US company and may handle request data (like your IP address) outside the
			EU, covered by its data protection terms.
		</li>
		<li>
			<strong>Google Fonts</strong> serves the site’s fonts, which means Google receives
			your IP address when a page loads.
		</li>
		<li>
			<strong>Google and Discord</strong> handle the login if you choose “Continue
			with Google” or “Continue with Discord”, under their own privacy policies. They
			learn that you logged in to Hear Me Out.
		</li>
		<li>
			<strong>Resend</strong> sends our emails, such as the link to reset your password.
			For this, it receives your email address and the content of the email. Its servers
			for our emails are in Ireland (EU).
		</li>
		<li>
			<strong>Cloudflare Turnstile</strong> checks that sign-ups, logins and password
			resets come from a real person, not a bot. For this, Cloudflare receives your
			IP address and some information about your browser on the sign-up, login and
			password reset pages.
		</li>
	</ul>

	<h2>Why</h2>
	<p>
		We use this information only to provide the service you signed up for:
		logging you in, saving what you make and showing it to the people you
		choose. Nothing is used for marketing.
	</p>

	<h2>How long</h2>
	<p>
		Everything is kept until you delete it. When you delete your account, your
		account, templates, tier lists and pictures are deleted straight away.
		Copies can remain in our providers’ backups and logs for a short time before
		they’re cleared automatically.
	</p>

	<h2>Your rights</h2>
	<ul>
		<li>
			<strong>See and correct</strong> your data: everything you’ve made is on
			<a href="/me">your page</a>, and you can change your username and password
			in <a href="/me/settings">settings</a>.
		</li>
		<li>
			<strong>Delete</strong> your account and all your data at any time in
			<a href="/me/settings">settings</a>.
		</li>
		<li>
			<strong>Ask questions or get a copy</strong> of your data:
			{#if contactEmail}
				email <a href="mailto:{contactEmail}">{contactEmail}</a>.
			{:else if issuesUrl}
				contact us through the <a href={issuesUrl} rel="noopener"
					>project’s GitHub page</a
				>.
			{:else}
				contact the person who runs this site.
			{/if}
		</li>
		<li>
			If you think we handle your data wrongly, you can complain to the Danish
			Data Protection Agency, <a
				href="https://www.datatilsynet.dk"
				rel="noopener">Datatilsynet</a
			>.
		</li>
	</ul>
</article>

<style>
	.privacy {
		max-width: 68ch;
	}
	.privacy h2 {
		margin-top: 32px;
		font-size: 1.25rem;
	}
	.lead {
		font-size: 1.0625rem;
	}
	.privacy ul {
		padding-left: 20px;
		display: grid;
		gap: 8px;
	}
</style>
