import "./tabContent.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { Build, BuildRestClient, Attachment } from "azure-devops-extension-api/Build";
import { Observer } from "azure-devops-ui/Observer";
import { Tab, TabBar, TabSize } from "azure-devops-ui/Tabs";

const ATTACHMENT_TYPE = "report-html";

SDK.init();
SDK.ready().then(() => {
  try {
    const config = SDK.getConfiguration();
    config.onBuildChanged((build: Build) => {
      let buildAttachmentClient = new BuildAttachmentClient(build);
      buildAttachmentClient.init().then(() => {
        displayReports(buildAttachmentClient);
      }).catch(error => { throw new Error(error); });
    });
  } catch (error) {
    throw new Error(error);
  }
});

function displayReports(attachmentClient: AttachmentClient) {
  ReactDOM.render(<TaskAttachmentPanel attachmentClient={attachmentClient} />, document.getElementById("html-report-extension-container"));
}

abstract class AttachmentClient {
  protected attachments: Attachment[] = [];
  protected authHeaders: Object = undefined;
  protected reportHtmlContent: string = undefined;

  public getAttachments(): Attachment[] {
    return this.attachments;
  }

  public getDownloadableAttachment(attachmentName: string): Attachment {
    const attachment = this.attachments.find((attachment) => attachment.name === attachmentName);
    if (!(attachment && attachment._links && attachment._links.self && attachment._links.self.href)) {
      throw new Error("Attachment " + attachmentName + " is not downloadable");
    }
    return attachment;
  }

  public async getAttachmentContent(attachmentName: string): Promise<string> {
    if (this.authHeaders === undefined) {
      console.log('Getting ADO access token.');
      const accessToken = await SDK.getAccessToken();
      const b64encodedAuth = btoa(':' + accessToken);
      this.authHeaders = { headers: { 'Authorization': 'Basic ' + b64encodedAuth } };
    }
    console.log("Loading " + attachmentName + " attachment content.");
    const attachment = this.getDownloadableAttachment(attachmentName);
    const response = await fetch(attachment._links.self.href, this.authHeaders);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const responseText = await response.text();
    console.log(attachmentName + " content loaded.");
    return responseText;
  }
}

class BuildAttachmentClient extends AttachmentClient {
  private build: Build;

  constructor(build: Build) {
    super();
    this.build = build;
  }

  public async init() {
    const buildClient: BuildRestClient = getClient(BuildRestClient);
    this.attachments = await buildClient.getAttachments(this.build.project.id, this.build.id, ATTACHMENT_TYPE);
    console.log(this.attachments);
  }
}

interface TaskAttachmentPanelProps {
  attachmentClient: AttachmentClient;
}

export default class TaskAttachmentPanel extends React.Component<TaskAttachmentPanelProps, { selectedTabId: string, tabContents: Map<string, string>, tabInitialContent: string; }> {

  constructor(props: TaskAttachmentPanelProps) {
    super(props);
    this.state = {
      selectedTabId: props.attachmentClient.getAttachments()[0]?.name || "",
      tabContents: new Map<string, string>(),
      tabInitialContent: '<div class="wide"><p>Loading...</p></div>'
    };
  }

  componentDidMount() {
    const { attachmentClient } = this.props;
    const attachments = attachmentClient.getAttachments();
    attachments.forEach(attachment => {
      if (!this.state.tabContents.has(attachment.name)) {
        this.fetchContent(attachment.name);
      }
    });
  }

  fetchContent = (attachmentName: string) => {
    if (this.state.tabContents.has(attachmentName)) {
      console.log("Content already fetched for: ", attachmentName);
      return;
    }
    this.props.attachmentClient.getAttachmentContent(attachmentName).then((content) => {
      this.setState(prevState => ({
        tabContents: prevState.tabContents.set(attachmentName, `<iframe class="wide tab-content flex-row flex-center" srcdoc="${this.escapeHTML(content)}"></iframe>`)
      }));
    }).catch(error => {
      console.error("Failed to fetch content for: ", attachmentName, error);
    });
  };


  escapeHTML(str: string) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  render() {
    const { selectedTabId, tabContents, tabInitialContent } = this.state;
    const attachments = this.props.attachmentClient.getAttachments();

    if (attachments.length === 0) {
      return null;
    }

    const containerClass = "wide"

    return (
        <div className={containerClass}>
          {attachments.length > 1 ? (
              <>
                <TabBar
                    onSelectedTabChanged={newTabId => this.setState({ selectedTabId: newTabId })}
                    selectedTabId={selectedTabId}
                    tabSize={TabSize.Tall}
                >
                  {attachments.map(attachment => {
                    const metadata = attachment.name.split('~');
                    let name = metadata[0];
                    let badgeCount = undefined;
                    if (metadata[2] !== '__default' && parseInt(metadata[3]) > 1) {
                      badgeCount = parseInt(metadata[3]);
                    }
                    return (
                        <Tab
                            name={name}
                            id={attachment.name}
                            key={attachment.name}
                            url={attachment._links.self.href}
                            badgeCount={badgeCount}
                        />
                    );
                  })}
                </TabBar>
                <Observer selectedTabId={selectedTabId} tabContents={tabContents}>
                  {(props: { selectedTabId: string }) => {
                    return <span dangerouslySetInnerHTML={{ __html: tabContents.get(props.selectedTabId) || tabInitialContent }} />;
                  }}
                </Observer>
              </>
          ) : (
              <span dangerouslySetInnerHTML={{ __html: tabContents.get(attachments[0].name) || tabInitialContent }} />
          )}
        </div>
    );
  }

}
