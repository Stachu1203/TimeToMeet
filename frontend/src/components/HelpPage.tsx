export function HelpPage() {
  const steps = [
    {
      step: "01",
      title: "Create or Join a Poll",
      body: "Sign in to create a new poll, select calendar dates, and set the daily time window and timezone. Participants opening a shared link can vote immediately as a guest or sign in.",
    },
    {
      step: "02",
      title: "Vote on Availability",
      body: "Switch to Vote mode and click or drag across the grid to select your available hours. You only see your own choices until you click 'Save my choices' to submit them to the group.",
    },
    {
      step: "03",
      title: "Inspect Group Overlap",
      body: "Inspect mode displays the combined heatmap. Hover over slots to see who is available, click a slot for detailed windows, or click any participant's badge to highlight their availability.",
    },
    {
      step: "04",
      title: "Review Matches & Finalize",
      body: "Matching dates appear below the calendar. Organizers can close the poll under 'Poll Options' to lock voting and view ranked Best Matches alongside the final calendar.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="border-b border-white/15 pb-5">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Help & Instructions
        </h1>
      </div>

      <div className="space-y-4">
        {steps.map((item) => (
          <div
            key={item.step}
            className="p-6 rounded-md bg-[#181a20] border border-white/15 flex flex-col sm:flex-row gap-5 items-start"
          >
            <span className="px-3 py-1.5 text-sm font-mono font-bold bg-white/10 text-white border border-white/20 rounded-md shrink-0">
              {item.step}
            </span>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="text-base text-white leading-relaxed">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
