// Copyright 2018 The Cockroach Authors.
//
// Use of this software is governed by the Business Source License
// included in the file licenses/BSL.txt.
//
// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0, included in the file
// licenses/APL.txt.

import React from "react";
import {ColumnDescriptor, SortedTable} from "src/views/shared/components/sortedtable";
import {cockroach} from "src/js/protos";
import {TimestampToMoment} from "src/util/convert";
import {DATE_FORMAT} from "src/util/format";
import {JobStatusCell} from "oss/src/views/jobs/jobStatusCell";
import {Icon, Pagination} from "antd";
import Empty from "src/views/app/components/empty";
import {SortSetting} from "oss/src/views/shared/components/sortabletable";
import {CachedDataReducerState} from "oss/src/redux/cachedDataReducer";
import _ from "lodash";
import {JobDescriptionCell} from "oss/src/views/jobs/jobDescriptionCell";
import Job = cockroach.server.serverpb.JobsResponse.IJob;
import JobsResponse = cockroach.server.serverpb.JobsResponse;

class JobsSortedTable extends SortedTable<Job> {}

const jobsTableColumns: ColumnDescriptor<Job>[] = [
  {
    title: "Description",
    className: "cl-table__col-query-text",
    cell: job => <JobDescriptionCell job={job}/>,
    sort: job => job.description,
  },
  {
    title: "Job ID",
    titleAlign: "right",
    cell: job => String(job.id),
    sort: job => job.id,
  },
  {
    title: "Users",
    cell: job => job.username,
    sort: job => job.username,
  },
  {
    title: "Creation Time",
    cell: job => TimestampToMoment(job.created).format(DATE_FORMAT),
    sort: job => TimestampToMoment(job.created).valueOf(),
  },
  {
    title: "Status",
    cell: job => <JobStatusCell job={job} />,
    sort: job => job.fraction_completed,
  },
];

export interface JobTableProps {
  sort: SortSetting;
  setSort: (value: SortSetting) => void;
  jobs: CachedDataReducerState<JobsResponse>;
  pageSize?: number;
  current?: number;
}

export interface JobTableState {
  pagination: {
    pageSize: number;
    current: number;
  };
}

export class JobTable extends React.Component<JobTableProps, JobTableState> {
  constructor(props: JobTableProps) {
    super(props);

    this.state = {
      pagination: {
        pageSize: props.pageSize || 20,
        current: props.current || 1,
      },
    };
  }

  componentDidUpdate(prevProps: Readonly<JobTableProps>): void {
    if (prevProps.jobs !== this.props.jobs) {
      this.setState((prevState: Readonly<any>) => {
        return {
          pagination: {
            ...prevState.pagination,
            current: 1,
          },
        };
      });
    }
  }

  onChangePage = (current: number) => {
    const { pagination } = this.state;
    this.setState({ pagination: { ...pagination, current }});
  }

  renderPage = (_page: number, type: "page" | "prev" | "next" | "jump-prev" | "jump-next", originalElement: React.ReactNode) => {
    switch (type) {
      case "jump-prev":
        return (
          <div className="_pg-jump">
            <Icon type="left" />
            <span className="_jump-dots">•••</span>
          </div>
        );
      case "jump-next":
        return (
          <div className="_pg-jump">
            <Icon type="right" />
            <span className="_jump-dots">•••</span>
          </div>
        );
      default:
        return originalElement;
    }
  }

  renderCounts = () => {
    const { pagination: { current, pageSize } } = this.state;
    const total = this.props.jobs.data.jobs.length;
    const pageCount = current * pageSize > total ? total : current * pageSize;
    const count = total > 10 ? pageCount : current * total;
    return `${count} of ${total} jobs`;
  }

  getData = () => {
    const { pagination: { current, pageSize } } = this.state;
    const jobs = this.props.jobs.data.jobs;
    const currentDefault = current - 1;
    const start = (currentDefault * pageSize);
    const end = (currentDefault * pageSize + pageSize);
    const data = jobs.slice(start, end);
    return data;
  }

  render() {
    const jobs = this.props.jobs.data.jobs;
    const { pagination } = this.state;
    if (_.isEmpty(jobs)) {
      return (
        <Empty
          title="Jobs will show up here"
          description="Jobs can include backup, import, restore or cdc running."
          buttonHref="https://www.cockroachlabs.com/docs/stable/admin-ui-jobs-page.html"
        />
      );
    }
    return (
      <React.Fragment>
        <div className="cl-table-statistic">
          <h4 className="cl-count-title">
            {this.renderCounts()}
          </h4>
        </div>
        <section className="cl-table-wrapper">
          <JobsSortedTable
            data={this.getData()}
            sortSetting={this.props.sort}
            onChangeSortSetting={this.props.setSort}
            className="jobs-table"
            rowClass={job => "jobs-table__row--" + job.status}
            columns={jobsTableColumns}
          />
        </section>
        <Pagination
          size="small"
          itemRender={this.renderPage as (page: number, type: "page" | "prev" | "next" | "jump-prev" | "jump-next") => React.ReactNode}
          pageSize={pagination.pageSize}
          current={pagination.current}
          total={jobs.length}
          onChange={this.onChangePage}
          hideOnSinglePage
        />
      </React.Fragment>
    );
  }
}
