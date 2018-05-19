<div component="widget/board-stats" class="widget-board-stats">
    <h3>Who's Online</h3>
    <p>
        <span component="widget/board-stats/count">{count}</span> users active in the past day (<span component="widget/board-stats/members">{members}</span> members and <span component="widget/board-stats/guests">{guests}</span> guests).<br />
        <span component="widget/board-stats/list">{list}</span>
    </p>

    <h3>Board Statistics</h3>
    <p>
        Our members have made a total of <span component="widget/board-stats/posts">{posts}</span> posts in <span component="widget/board-stats/topics">{topics}</span> topics.<br />
        We currently have <span component="widget/board-stats/registered">{registered}</span> members registered.<br />
        Please welcome our newest member, <span component="widget/board-stats/latest">{latest}</span>.<br />

        The most users online at one time was <span>{mostUsers.total}</span> on {mostUsers.date}.
    </p>
</div>
