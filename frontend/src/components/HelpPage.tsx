export function HelpPage() {
  const steps = [
    {
      step: "01",
      title: "Sign In or Switch Participant",
      body: "First step.",
    },
    {
      step: "02",
      title: "Create a New Meeting Poll",
      body: "lorem ipsum.",
    },
    {
      step: "03",
      title: "Vote & Inspect Participants on Hover",
      body: "third step.",
    },
    {
      step: "04",
      title: "Read the Progress Bar & Joined Matching Windows",
      body: "test.",
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
