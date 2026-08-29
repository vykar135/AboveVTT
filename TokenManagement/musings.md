# CACHES
The existing caches for Open5E (cached_open5e_items and open5e_monsters) seems rather unreliable as they doesn't react to tokens on the board. The stat block system implements its own cache for these items to address this issue.  Should look at consolidating the caches later.

# BUGS
There are numerous bugs in the visualization of the stat blocks for Open 5E.  Several of the stats are just the wrong amount and are off by a lot.  There are stats that are zero that are defined in the API response and some appear to be doubled.

# OVER FETCHING
Why is there a prefetch of both D&D Beyond and Open5E monsters for the token panel? How useful is having the stat block for an Aarakocra Aeromancer amd Adult Black Dragon Lich on tap every time you refresh the VTT?  This should probably wait until the DM actually initiates a search.

Why is there a prefetch for every spell and item in the user's collection on game startup but tooltips are deferred?  If the user is going to wait there is no reason not to defer the load of the raw data until something interacts with it.  Startup could be significantly faster if these didn't need to happen.